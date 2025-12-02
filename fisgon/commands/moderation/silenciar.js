const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('silenciar')
    .setDescription('Silencia a un usuario (usa timeout)')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
    .addIntegerOption(i => i.setName('minutos').setDescription('Duración en minutos').setRequired(false))
    .addStringOption(s => s.setName('razon').setDescription('Razón').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const minutos = interaction.options.getInteger('minutos') || 10;
    const razon = interaction.options.getString('razon') || 'Sin razón';
    const member = await interaction.guild.members.fetch(target.id).catch(()=>null);
    if (!member) return interaction.reply({ content: 'Usuario no encontrado.', ephemeral: true });
    try {
      await member.timeout(minutos * 60 * 1000, razon);
      db.addInfraction(interaction.guild.id, target.id, interaction.user.id, razon, 'mute');
      const logId = db.getLogChannel(interaction.guild.id);
      if (logId) {
        const ch = await interaction.client.channels.fetch(logId).catch(()=>null);
        if (ch && ch.send) ch.send(`🔇 **Silenciado**: ${target.tag} por ${interaction.user.tag} durante ${minutos} minutos. Razón: ${razon}`);
      }
      return interaction.reply({ content: `Usuario silenciado por ${minutos} minutos.` });
    } catch (err) {
      return interaction.reply({ content: 'No pude silenciar al usuario (posibles permisos).', ephemeral: true });
    }
  }
};