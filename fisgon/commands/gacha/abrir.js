const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAvailableSets, getCardsInSet } = require('../../utils/cardRegistry');
const { configRareza } = require('../../utils/gachaItems');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-abrir')
    .setDescription('Compra y abre sobres de cartas')
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (1 o 10)').setRequired(false)),

  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad') || 1;
    const sets = getAvailableSets(interaction.guild.id);

    // Si solo hay un set (default), saltamos la selección
    if (sets.length === 1) {
        await procesarCompra(interaction, sets[0], cantidad);
        return;
    }

    // MENÚ DE SELECCIÓN DE SET
    const options = sets.map(s => ({
        label: s.name,
        description: `Precio: ${s.price} monedas`,
        value: s.id,
        emoji: '📦'
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('select_set').setPlaceholder('Elige un Set de Cartas').addOptions(options)
    );

    const msg = await interaction.reply({ content: 'Selecciona qué colección quieres abrir:', components: [row], fetchReply: true });

    try {
        const selection = await msg.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 30000, componentType: ComponentType.StringSelect });
        const setId = selection.values[0];
        const setObj = sets.find(s => s.id === setId);

        await selection.deferUpdate(); // Evita error de interacción fallida
        await procesarCompra(interaction, setObj, cantidad, msg);

    } catch (e) {
        await interaction.editReply({ content: 'Tiempo agotado.', components: [] }).catch(()=>{});
    }
  }
};

async function procesarCompra(interaction, setObj, cantidad, msgExistente = null) {
    const costoTotal = setObj.price * cantidad;
    const balance = db.getBalance(interaction.guild.id, interaction.user.id);

    if (balance < costoTotal) {
        const text = `❌ No tienes suficientes monedas. Necesitas **${costoTotal}** para el set **${setObj.name}**.\nTienes: ${balance}.`;
        if (msgExistente) await interaction.editReply({ content: text, components: [] });
        else await interaction.reply({ content: text, ephemeral: true });
        return;
    }

    // Cobrar
    db.addBalance(interaction.guild.id, interaction.user.id, -costoTotal);

    // Obtener cartas del set
    const poolCartas = getCardsInSet(interaction.guild.id, setObj.id);
    if (poolCartas.length === 0) {
        if (msgExistente) await interaction.editReply({ content: '⚠️ Este set está vacío. Dile a un admin que añada cartas.', components: [] });
        else await interaction.reply({ content: '⚠️ Set vacío.', ephemeral: true });
        return;
    }

    // Generar premios
    const cartasObtenidas = [];
    for (let i = 0; i < cantidad; i++) {
        const rand = Math.random() * 100;
        let rareza = 'Common';
        if (rand <= configRareza.Legendary.chance) rareza = 'Legendary';
        else if (rand <= configRareza.Epic.chance) rareza = 'Epic';
        else if (rand <= configRareza.Rare.chance) rareza = 'Rare';

        // Filtrar por rareza dentro del set
        let subPool = poolCartas.filter(c => c.rarity === rareza);
        // Si no hay cartas de esa rareza en este set, cogemos cualquiera del set
        if (subPool.length === 0) subPool = poolCartas;

        const carta = subPool[Math.floor(Math.random() * subPool.length)];
        cartasObtenidas.push(carta);
        db.addToInventory(interaction.guild.id, interaction.user.id, carta.id, 1);
    }

    // ANIMACIÓN
    const embedAnim = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`Abriendo ${cantidad} sobre(s) de ${setObj.name}...`)
        .setDescription('✂️ Rasgando envoltorios...');

    if (msgExistente) await interaction.editReply({ content: '', embeds: [embedAnim], components: [] });
    else await interaction.reply({ embeds: [embedAnim] });

    await wait(2000);

    // MOSTRAR RESULTADOS
    if (cantidad === 1) {
        const c = cartasObtenidas[0];
        const info = configRareza[c.rarity];
        const finalEmbed = new EmbedBuilder()
            .setTitle(`¡Conseguiste: ${c.name}!`)
            .setDescription(`**${info.label}** ${c.emoji}\nSet: ${setObj.name}`)
            .setColor(info.color)
            .setFooter({ text: `Costo: ${costoTotal}` });

        if (c.image) finalEmbed.setImage(c.image);
        await interaction.editReply({ embeds: [finalEmbed] });
    } else {
        // Multi
        let desc = '';
        const orden = { 'Legendary': 0, 'Epic': 1, 'Rare': 2, 'Common': 3 };
        cartasObtenidas.sort((a, b) => orden[a.rarity] - orden[b.rarity]);

        cartasObtenidas.forEach(c => {
            desc += `${c.emoji} **${c.name}** (${configRareza[c.rarity].label})\n`;
        });

        const finalEmbed = new EmbedBuilder()
            .setTitle(`Contenido de ${cantidad} sobres`)
            .setDescription(desc)
            .setColor('#2F3136')
            .setFooter({ text: `Set: ${setObj.name}` });

        await interaction.editReply({ embeds: [finalEmbed] });
    }
}