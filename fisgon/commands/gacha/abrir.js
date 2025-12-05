const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAvailableSets, getCardsInSet } = require('../../utils/cardRegistry');
const { configRareza } = require('../../utils/gachaItems');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-abrir')
    .setDescription('Abre sobres de cartas. Usa sobres GRATIS si tienes.'),

  async execute(interaction) {
    const sets = getAvailableSets(interaction.guild.id);
    if (sets.length === 0) return interaction.reply({ content: '⚠️ No hay colecciones disponibles.', ephemeral: true });

    // Verificar Atrapasueños
    const dream = db.getDreamcatcher(interaction.guild.id, interaction.user.id);
    const freePacks = dream.free_packs || 0;
    const esGratis = freePacks > 0;

    const options = sets.map(s => ({
        label: s.name,
        description: esGratis ? '¡GRATIS! (Atrapasueños)' : `Precio: ${s.price} monedas`,
        value: s.id,
        emoji: esGratis ? '🎁' : '📦'
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('sel_set').setPlaceholder('Elige un Set').addOptions(options)
    );

    const txt = esGratis 
        ? `🎉 **¡Tienes ${freePacks} sobre(s) gratis!** Elige colección:` 
        : `Selecciona colección para comprar:`;

    const msg = await interaction.reply({ content: txt, components: [row], fetchReply: true });

    try {
        const i = await msg.awaitMessageComponent({ filter: x => x.user.id === interaction.user.id, time: 30000, componentType: ComponentType.StringSelect });
        const setId = i.values[0];
        const setObj = sets.find(s => s.id === setId);
        await i.deferUpdate();

        // Cobrar
        if (esGratis) {
            db.useFreePack(interaction.guild.id, interaction.user.id);
        } else {
            const bal = db.getBalance(interaction.guild.id, interaction.user.id);
            if (bal < setObj.price) return interaction.editReply({ content: `❌ No tienes suficientes monedas (${setObj.price}).`, components: [] });
            db.addBalance(interaction.guild.id, interaction.user.id, -setObj.price);
        }

        // Obtener Carta
        const pool = getCardsInSet(interaction.guild.id, setId);
        if (pool.length === 0) return interaction.editReply({ content: '⚠️ Set vacío.', components: [] });

        // Probabilidad
        const r = Math.random() * 100;
        let rareza = 'Common';
        if (r <= configRareza.Legendary.chance) rareza = 'Legendary';
        else if (r <= configRareza.Epic.chance) rareza = 'Epic';
        else if (r <= configRareza.Rare.chance) rareza = 'Rare';

        let subPool = pool.filter(c => c.rarity === rareza);
        if (subPool.length === 0) subPool = pool;
        const carta = subPool[Math.floor(Math.random() * subPool.length)];

        db.addToInventory(interaction.guild.id, interaction.user.id, carta.id, 1);

        // Animación
        const embedAnim = new EmbedBuilder().setColor('#2F3136').setTitle('Abriendo...').setDescription('✂️ Rasgando envoltorio...');
        await interaction.editReply({ content: '', embeds: [embedAnim], components: [] });
        await wait(2000);

        const info = configRareza[carta.rarity];
        const embed = new EmbedBuilder()
            .setTitle(`¡Obtuviste: ${carta.name}!`)
            .setDescription(`**${info.label}**\n${carta.subtype || 'Sin tipo'}`)
            .setColor(info.color)
            .setFooter({ text: esGratis ? 'Canjeado Gratis' : `Costo: ${setObj.price}` });

        if (carta.image) embed.setImage(carta.image);
        await interaction.editReply({ embeds: [embed] });

    } catch (e) {
        await interaction.editReply({ content: 'Tiempo agotado.', components: [] }).catch(()=>{});
    }
  }
};