const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nivel-recompensa-listar')
    .setDescription('Lista los roles configurados por nivel en este servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const rows = db.listLevelRoles(interaction.guild.id);
    if (!rows || rows.length === 0) return interaction.reply({ content: 'No hay roles configurados por nivel en este servidor.', ephemeral: true });
    let texto = '**Roles por nivel:**\n';
    for (const r of rows) {
      texto += `• Nivel ${r.level} → <@&${r.role_id}>\n`;
    }
    return interaction.reply({ content: texto, ephemeral: true });
  }
};