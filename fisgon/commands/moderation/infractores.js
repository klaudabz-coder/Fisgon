const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractores')
    .setDescription('Muestra las infracciones de un usuario')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const rows = db.getInfractions(interaction.guild.id, target.id);
    if (!rows || rows.length === 0) return interaction.reply({ content: 'No tiene infracciones.', ephemeral: true });
    let texto = `Infracciones de **${target.tag}**:\n`;
    for (const r of rows) texto += `• [${new Date(r.created_at).toLocaleString()}] **${r.type}** por ${r.moderator_id} - ${r.reason}\n`;
    return interaction.reply({ content: texto, ephemeral: true });
  }
};