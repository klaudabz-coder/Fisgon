const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-info')
    .setDescription('Muestra las estadísticas detalladas de una carta')
    .addStringOption(option => option.setName('carta').setDescription('Nombre').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const filtered = itemsGacha.filter(item => item.name.toLowerCase().includes(focusedValue));
    await interaction.respond(filtered.slice(0, 25).map(item => ({ name: item.name, value: item.id })));
  },

  async execute(interaction) {
    const cartaId = interaction.options.getString('carta');
    const carta = itemsGacha.find(c => c.id === cartaId || c.name.toLowerCase() === cartaId.toLowerCase());

    if (!carta) return interaction.reply({ content: '❌ Carta no encontrada.', ephemeral: true });

    const infoRareza = configRareza[carta.rarity];
    const embed = new EmbedBuilder()
        .setTitle(`${carta.emoji} ${carta.name}`)
        .setDescription(`**Rol:** ${carta.role === 'fighter' ? '⚔️ Luchador' : '🔮 Soporte'}\n**Rareza:** ${infoRareza.label}`)
        .setColor(infoRareza.color);

    if (carta.image) embed.setThumbnail(carta.image);

    if (carta.role === 'fighter') {
        embed.addFields(
            { name: 'Estadísticas', value: `❤️ HP: ${carta.stats.hp}\n⚔️ ATK: ${carta.stats.atk}\n🛡️ DEF: ${carta.stats.def}\n💨 SPD: ${carta.stats.spd}`, inline: false },
            { name: 'Habilidades', value: carta.skills.map(s => `🔹 **${s.name}** (CD: ${s.cd}): ${s.desc}`).join('\n'), inline: false }
        );
    } else {
        // Es Soporte
        const a = carta.assist;
        embed.addFields(
            { name: 'Habilidad de Apoyo', value: `✨ **${a.name}** (CD: ${a.cd})\n${a.desc}`, inline: false }
        );
    }

    await interaction.reply({ embeds: [embed] });
  }
};