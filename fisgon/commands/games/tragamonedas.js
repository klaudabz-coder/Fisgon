const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const SYMBOLS = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '🔔'];

// Función auxiliar para esperar (delay)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para obtener una tirada aleatoria
function spin() {
    return [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tragamonedas')
    .setDescription('Juega a las tragamonedas apostando monedas')
    .addIntegerOption(i => i.setName('cantidad').setDescription('Cantidad a apostar').setRequired(true)),
    
  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad');
    const user = interaction.user;

    // 1. Validaciones
    if (cantidad <= 0) return interaction.reply({ content: 'Cantidad inválida.', ephemeral: true });

    const balance = db.getBalance(interaction.guild.id, user.id);
    if (balance < cantidad) return interaction.reply({ content: 'No tienes suficiente saldo.', ephemeral: true });

    // 2. Descontar apuesta inicial inmediatamente
    db.addBalance(interaction.guild.id, user.id, -cantidad);

    // 3. Calcular el resultado FINAL ahora (se mostrará después de la animación)
    const [s1, s2, s3] = spin();
    let multiplicador = 0;
    let ganado = 0;

    if (s1 === s2 && s2 === s3) {
        multiplicador = 5; // 3 iguales
    } else if (s1 === s2 || s1 === s3 || s2 === s3) {
        multiplicador = 2; // 2 iguales
    }
    ganado = cantidad * multiplicador;

    // 4. Enviar mensaje inicial de "Girando..."
    const embedAnimacion = new EmbedBuilder()
        .setAuthor({ name: `Tragamonedas de ${user.username}`, iconURL: user.displayAvatarURL() })
        .setColor('#2f3136')
        .setDescription(`
            **------------------**
            **|** 🎰  **|** 🎰  **|** 🎰  **|**
            **------------------**
            *Girando los rodillos...*
        `)
        .setFooter({ text: '¡Buena suerte!' });

    // Usamos fetchReply para poder editarlo luego
    await interaction.reply({ embeds: [embedAnimacion], fetchReply: true });

    // 5. Bucle de animación (simular movimiento)
    // Editamos el mensaje 2 veces con iconos aleatorios antes del final
    for (let i = 0; i < 2; i++) {
        await wait(1000); // Esperar 1 segundo entre "giros"
        const [r1, r2, r3] = spin(); // Iconos aleatorios para la animación
        
        embedAnimacion.setDescription(`
            **------------------**
            **|** ${r1}  **|** ${r2}  **|** ${r3}  **|**
            **------------------**
            *Girando...*
        `);
        
        await interaction.editReply({ embeds: [embedAnimacion] });
    }

    await wait(1000); // Espera final antes de mostrar el resultado

    // 6. Actualizar base de datos con premio (si ganó)
    if (ganado > 0) {
        db.addBalance(interaction.guild.id, user.id, ganado);
    }

    // 7. Construir Embed Final con el resultado real
    const esVictoria = ganado > 0;
    const colorEmbed = esVictoria ? '#57f287' : '#ed4245'; // Verde o Rojo
    
    const embedFinal = new EmbedBuilder()
        .setAuthor({ name: `Tragamonedas de ${user.username}`, iconURL: user.displayAvatarURL() })
        .setColor(colorEmbed)
        .setDescription(`
            **------------------**
            **|** ${s1}  **|** ${s2}  **|** ${s3}  **|**
            **------------------**
        `)
        .addFields(
            { name: 'Apuesta', value: `${cantidad} monedas`, inline: true },
            { name: 'Multiplicador', value: `${multiplicador}x`, inline: true },
            { name: 'Ganancia', value: `**${ganado}** monedas`, inline: true }
        )
        .setFooter({ text: esVictoria ? '¡Felicidades!' : 'Mejor suerte la próxima vez.' });

    // 8. Editar el mensaje con el resultado final
    return interaction.editReply({ embeds: [embedFinal] });
  }
};