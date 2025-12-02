const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-info')
    .setDescription('Muestra detalles de una carta')
    .addStringOption(option => option.setName('carta').setDescription('Nombre').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const val = interaction.options.getFocused().toLowerCase();
    const filtered = itemsGacha.filter(i => i.name.toLowerCase().includes(val));
    await interaction.respond(filtered.slice(0, 25).map(i => ({ name: i.name, value: i.id })));
  },

  async execute(interaction) {
    const id = interaction.options.getString('carta');
    const carta = itemsGacha.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

    if (!carta) return interaction.reply({ content: '❌ No encontrada.', ephemeral: true });

    const info = configRareza[carta.rarity];
    const embed = new EmbedBuilder()
        .setTitle(`${carta.emoji} ${carta.name}`)
        .setDescription(`**Rareza:** ${info.label}\nEsta carta puede usarse como Luchador o Soporte.`)
        .setColor(info.color);

    if (carta.image) embed.setThumbnail(carta.image);

    // Skills Luchador
    const skillsText = carta.skills.map(s => `🔹 **${s.name}** (CD:${s.cd}): ${s.desc}`).join('\n');
    embed.addFields({ name: '⚔️ Modo Luchador', value: `HP: ${carta.stats.hp} | ATK: ${carta.stats.atk} | DEF: ${carta.stats.def}\n${skillsText}` });

    // Skill Soporte
    embed.addFields({ name: '🔮 Modo Soporte', value: `✨ **${carta.assist.name}** (CD:${carta.assist.cd})\n${carta.assist.desc}` });

    // Sinergia
    if (carta.synergy) {
        embed.addFields({ name: '🤝 Sinergia', value: `Con **${carta.synergy.target}**: ${carta.synergy.desc}` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};