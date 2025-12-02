const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ruleta')
    .setDescription('Apuesta a un color en la ruleta')
    .addStringOption(option => 
        option.setName('color')
            .setDescription('El color al que quieres apostar')
            .setRequired(true)
            .addChoices(
                { name: '🔴 Rojo (1.5x)', value: 'rojo' },
                { name: '⚫ Negro (2x)', value: 'negro' },
                { name: '🟢 Verde (15x)', value: 'verde' }
            )
    )
    .addIntegerOption(option => 
        option.setName('cantidad')
            .setDescription('Cantidad de monedas a apostar')
            .setRequired(true)
    ),

  async execute(interaction) {
    const colorApostado = interaction.options.getString('color');
    const cantidad = interaction.options.getInteger('cantidad');
    const user = interaction.user;

    if (cantidad <= 0) return interaction.reply({ content: 'Cantidad inválida.', ephemeral: true });

    const balance = db.getBalance(interaction.guild.id, user.id);
    if (balance < cantidad) return interaction.reply({ content: 'No tienes suficiente saldo.', ephemeral: true });

    // Descontar apuesta inicial
    db.addBalance(interaction.guild.id, user.id, -cantidad);

    // Lógica de la Ruleta (0-36)
    const resultadoNum = Math.floor(Math.random() * 37);
    
    // Determinar color del resultado
    // 0 = Verde
    // Impares = Rojo
    // Pares (excluyendo 0) = Negro
    let colorResultado;
    if (resultadoNum === 0) {
        colorResultado = 'verde';
    } else if (resultadoNum % 2 !== 0) {
        colorResultado = 'rojo';
    } else {
        colorResultado = 'negro';
    }

    // Emojis para visualización
    const emojis = {
        'rojo': '🔴',
        'negro': '⚫',
        'verde': '🟢'
    };

    // Calcular Ganancias
    let ganado = 0;
    let descripcion = '';
    let colorEmbed = '';

    if (colorApostado === colorResultado) {
        // Multiplicadores
        if (colorResultado === 'verde') ganado = cantidad * 15;
        else if (colorResultado === 'rojo') ganado = Math.floor(cantidad * 1.5);
        else if (colorResultado === 'negro') ganado = cantidad * 2;

        db.addBalance(interaction.guild.id, user.id, ganado);
        
        descripcion = `🎉 **¡Ganaste!**\nLa bola cayó en **${emojis[colorResultado]} ${resultadoNum}**.\nHas recibido **${ganado}** monedas.`;
        colorEmbed = '#57f287'; // Verde (Green)
    } else {
        descripcion = `📉 **Perdiste.**\nLa bola cayó en **${emojis[colorResultado]} ${resultadoNum}**.\nMejor suerte la próxima vez.`;
        colorEmbed = '#ed4245'; // Rojo (Red)
    }

    // Crear Embed
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Ruleta de ${user.username}`, iconURL: user.displayAvatarURL() })
        .setColor(colorEmbed)
        .addFields(
            { name: 'Tu Apuesta', value: `${emojis[colorApostado]} ${colorApostado.charAt(0).toUpperCase() + colorApostado.slice(1)}\nValor: **${cantidad}**`, inline: true },
            { name: 'Resultado', value: `${emojis[colorResultado]} **${resultadoNum}**`, inline: true }
        )
        .setDescription(descripcion)
        .setFooter({ text: `Multiplicadores: 🔴 1.5x | ⚫ 2x | 🟢 15x` });

    return interaction.reply({ embeds: [embed] });
  }
};