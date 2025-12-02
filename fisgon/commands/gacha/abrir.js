const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

// Función para esperar (delay)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-abrir')
    .setDescription('Compra y abre un sobre de cartas coleccionables')
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de sobres (1 o 10)').setRequired(false)),

  async execute(interaction) {
    const cantidadSobres = interaction.options.getInteger('cantidad') || 1;
    const precioPorSobre = 100; 
    const costoTotal = precioPorSobre * cantidadSobres;

    if (cantidadSobres !== 1 && cantidadSobres !== 10) {
        return interaction.reply({ content: 'Solo puedes abrir 1 o 10 sobres a la vez.', ephemeral: true });
    }

    // 1. Verificar saldo
    const balance = db.getBalance(interaction.guild.id, interaction.user.id);
    if (balance < costoTotal) {
        return interaction.reply({ content: `No tienes suficientes monedas. Necesitas **${costoTotal}** para estos sobres.`, ephemeral: true });
    }

    // 2. Cobrar y Generar Cartas
    db.addBalance(interaction.guild.id, interaction.user.id, -costoTotal);

    const cartasObtenidas = [];
    for (let i = 0; i < cantidadSobres; i++) {
        const rand = Math.random() * 100;
        let rareza = 'Common';

        if (rand <= configRareza.Legendary.chance) rareza = 'Legendary';
        else if (rand <= configRareza.Epic.chance) rareza = 'Epic';
        else if (rand <= configRareza.Rare.chance) rareza = 'Rare';

        const pool = itemsGacha.filter(item => item.rarity === rareza);
        const carta = pool[Math.floor(Math.random() * pool.length)];

        cartasObtenidas.push(carta);
        db.addToInventory(interaction.guild.id, interaction.user.id, carta.id, 1);
    }

    // --- ANIMACIÓN DE APERTURA ---

    // CASO A: UN SOLO SOBRE
    if (cantidadSobres === 1) {
        const carta = cartasObtenidas[0];
        const info = configRareza[carta.rarity];

        // Animación paso a paso
        const frames = [
            '📦 **Abriendo sobre...**\n*(Rasgas el envoltorio)*',
            '✨ **¡Brillo misterioso!**\n*(Algo se ve dentro...)*',
            '🃏 **¡Carta revelada!**'
        ];

        const embedAnim = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle('Tienda de Cartas')
            .setDescription(frames[0]);

        await interaction.reply({ embeds: [embedAnim], fetchReply: true });

        for (let i = 1; i < frames.length; i++) {
            await wait(1000); // 1 segundo por paso
            embedAnim.setDescription(frames[i]);
            await interaction.editReply({ embeds: [embedAnim] });
        }

        await wait(500);

        // Resultado Final
        const embedFinal = new EmbedBuilder()
            .setTitle(`¡Has conseguido: ${carta.name}!`)
            .setDescription(`**Rareza:** ${info.label} ${carta.emoji}\n\n*Guardada en tu álbum.*`)
            .setColor(info.color)
            .setFooter({ text: `Costo: ${costoTotal} monedas` });

        if (carta.image) embedFinal.setImage(carta.image); // Muestra la carta en grande

        // Tracking de misiones
        try {
             const { trackQuest, QUEST_TYPES } = require('../../utils/quests');
             trackQuest(interaction.guild.id, interaction.user.id, QUEST_TYPES.GACHA, 1);
        } catch(e) {}

        return interaction.editReply({ embeds: [embedFinal] });
    } 

    // CASO B: CAJA DE 10 SOBRES
    else {
        const embedBox = new EmbedBuilder()
            .setTitle('📦 Abriendo caja de sobres...')
            .setColor('#2f3136')
            .setDescription('✂️ Rasgando envoltorios...');

        await interaction.reply({ embeds: [embedBox], fetchReply: true });

        await wait(2000); 

        // Resumen
        let descripcion = '';
        const orden = { 'Legendary': 0, 'Epic': 1, 'Rare': 2, 'Common': 3 };
        cartasObtenidas.sort((a, b) => orden[a.rarity] - orden[b.rarity]);

        cartasObtenidas.forEach(c => {
            const label = configRareza[c.rarity].label;
            descripcion += `🃏 **${c.name}** — ${label}\n`;
        });

        const embedFinal = new EmbedBuilder()
            .setTitle(`🎁 Contenido de la Caja (10 sobres)`)
            .setDescription(descripcion)
            .setColor('#2F3136')
            .setFooter({ text: `Todas las cartas se han guardado.` });

        // Tracking
        try {
             const { trackQuest, QUEST_TYPES } = require('../../utils/quests');
             trackQuest(interaction.guild.id, interaction.user.id, QUEST_TYPES.GACHA, 10);
        } catch(e) {}

        return interaction.editReply({ embeds: [embedFinal] });
    }
  }
};