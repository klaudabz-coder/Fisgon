const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Añade una advertencia (warn) a un usuario')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
    .addStringOption(s => s.setName('razon').setDescription('Razón').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin razón';
    db.addInfraction(interaction.guild.id, target.id, interaction.user.id, razon, 'warn');
    const logId = db.getLogChannel(interaction.guild.id);
    if (logId) {
      const ch = await interaction.client.channels.fetch(logId).catch(()=>null);
      if (ch && ch.send) ch.send(`⚠️ **Advertencia**: ${target.tag} por ${interaction.user.tag}. Razón: ${razon}`);
    }
    return interaction.reply({ content: `Advertencia añadida a ${target.tag}.`, ephemeral: true });
  }
};