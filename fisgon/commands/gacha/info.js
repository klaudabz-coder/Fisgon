const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllCards } = require('../../utils/cardRegistry'); // <--- USAR REGISTRY
const { configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-info')
    .setDescription('Muestra detalles de una carta')
    .addStringOption(option => option.setName('carta').setDescription('Nombre').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const allCards = getAllCards(interaction.guild.id);
    const val = interaction.options.getFocused().toLowerCase();
    const filtered = allCards.filter(i => i.name.toLowerCase().includes(val));
    await interaction.respond(filtered.slice(0, 25).map(i => ({ name: i.name, value: i.id })));
  },

  async execute(interaction) {
    const allCards = getAllCards(interaction.guild.id);
    const id = interaction.options.getString('carta');
    const carta = allCards.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

    if (!carta) return interaction.reply({ content: '❌ No encontrada.', ephemeral: true });

    const info = configRareza[carta.rarity] || { label: carta.rarity, color: '#999999' };
    const embed = new EmbedBuilder()
        .setTitle(`${carta.emoji} ${carta.name}`)
        .setDescription(`**Rareza:** ${info.label}\n**Set:** ${carta.set}`)
        .setColor(info.color);

    if (carta.image) embed.setThumbnail(carta.image);

    // Mostrar stats genéricos si es custom
    if (carta.role === 'fighter') {
        const s = carta.stats;
        embed.addFields({ name: 'Stats', value: `HP: ${s.hp} ATK: ${s.atk} DEF: ${s.def} SPD: ${s.spd}` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};