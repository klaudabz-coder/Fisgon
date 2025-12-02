const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha-tirar')
    .setDescription('Gasta monedas para invocar un personaje aleatorio')
    .addIntegerOption(o => o.setName('cantidad').setDescription('Número de tiros (1 o 10)').setRequired(false)),

  async execute(interaction) {
    const cantidadTiros = interaction.options.getInteger('cantidad') || 1;
    const precioPorTiro = 100; // PRECIO CONFIGURABLE
    const costoTotal = precioPorTiro * cantidadTiros;

    if (cantidadTiros !== 1 && cantidadTiros !== 10) {
        return interaction.reply({ content: 'Solo puedes hacer tiradas de 1 o 10 a la vez.', ephemeral: true });
    }

    // 1. Verificar saldo
    const balance = db.getBalance(interaction.guild.id, interaction.user.id);
    if (balance < costoTotal) {
        return interaction.reply({ content: `No tienes suficientes monedas. Necesitas **${costoTotal}** (Tienes: ${balance})`, ephemeral: true });
    }

    // 2. Cobrar
    db.addBalance(interaction.guild.id, interaction.user.id, -costoTotal);

    // 3. Lógica de selección
    const resultados = [];

    for (let i = 0; i < cantidadTiros; i++) {
        const rand = Math.random() * 100; // Número entre 0 y 100
        let rarezaSeleccionada = 'Common';

        // Determinar rareza según el número aleatorio
        if (rand <= configRareza.Legendary.chance) rarezaSeleccionada = 'Legendary';
        else if (rand <= configRareza.Epic.chance) rarezaSeleccionada = 'Epic';
        else if (rand <= configRareza.Rare.chance) rarezaSeleccionada = 'Rare';

        // Filtrar items de esa rareza
        const pool = itemsGacha.filter(item => item.rarity === rarezaSeleccionada);
        // Elegir uno al azar de esa rareza
        const itemGanado = pool[Math.floor(Math.random() * pool.length)];

        resultados.push(itemGanado);

        // Guardar en inventario (Usamos la función existente de tu database.js)
        db.addToInventory(interaction.guild.id, interaction.user.id, itemGanado.id, 1);
    }

    // 4. Mostrar resultados
    if (cantidadTiros === 1) {
        // Embed detallado para un solo tiro
        const item = resultados[0];
        const infoRareza = configRareza[item.rarity];

        const embed = new EmbedBuilder()
            .setTitle(`¡Has obtenido: ${item.name}!`)
            .setDescription(`Rareza: **${infoRareza.label}** ${item.emoji}`)
            .setColor(infoRareza.color)
            .setFooter({ text: `Costo: ${costoTotal} monedas` });

        if (item.image) embed.setThumbnail(item.image);

        return interaction.reply({ content: `🎰 **Gacha Pull** de ${interaction.user}`, embeds: [embed] });

    } else {
        // Lista resumen para 10 tiros
        let descripcion = '';
        // Ordenamos por rareza para que se vean mejor (Legendarios primero)
        const orden = { 'Legendary': 0, 'Epic': 1, 'Rare': 2, 'Common': 3 };
        resultados.sort((a, b) => orden[a.rarity] - orden[b.rarity]);

        resultados.forEach(item => {
            const label = configRareza[item.rarity].label;
            descripcion += `${item.emoji} **${item.name}** (${label})\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`Resultados de 10 tiradas`)
            .setDescription(descripcion)
            .setColor('#2F3136')
            .setFooter({ text: `Gastaste ${costoTotal} monedas` });

        return interaction.reply({ content: `🎰 **Multi-Gacha** de ${interaction.user}`, embeds: [embed] });
    }
  }
};