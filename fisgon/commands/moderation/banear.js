const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banear')
    .setDescription('Banea a un miembro del servidor')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(s => s.setName('razon').setDescription('Razón').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin razón';
    await interaction.guild.members.ban(target.id, { reason: razon }).catch(err=>{});
    db.addInfraction(interaction.guild.id, target.id, interaction.user.id, razon, 'ban');
    const logId = db.getLogChannel(interaction.guild.id);
    if (logId) {
      const ch = await interaction.client.channels.fetch(logId).catch(()=>null);
      if (ch && ch.send) ch.send(`🔨 **Baneado**: ${target.tag} por ${interaction.user.tag}. Razón: ${razon}`);
    }
    return interaction.reply({ content: `Usuario baneado: ${target.tag}` });
  }
};