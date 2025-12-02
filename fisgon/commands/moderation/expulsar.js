const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('expulsar')
    .setDescription('Expulsa a un miembro del servidor')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(s => s.setName('razon').setDescription('Razón').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'Sin razón';
    const member = await interaction.guild.members.fetch(target.id).catch(()=>null);
    if (!member) return interaction.reply({ content: 'Usuario no encontrado en el servidor.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: 'No puedo expulsar a este usuario.', ephemeral: true });
    await member.kick(razon).catch(err=>{});
    db.addInfraction(interaction.guild.id, target.id, interaction.user.id, razon, 'kick');
    const logId = db.getLogChannel(interaction.guild.id);
    if (logId) {
      const ch = await interaction.client.channels.fetch(logId).catch(()=>null);
      if (ch && ch.send) ch.send(`🔨 **Expulsado**: ${target.tag} por ${interaction.user.tag}. Razón: ${razon}`);
    }
    return interaction.reply({ content: `Usuario expulsado: ${target.tag}` });
  }
};