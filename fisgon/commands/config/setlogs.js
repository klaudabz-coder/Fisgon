const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurar-logs')
    .setDescription('Establece el canal donde el bot enviará logs del servidor')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal de texto para logs').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const canal = interaction.options.getChannel('canal');
    if (!canal || !canal.isTextBased()) return interaction.reply({ content: 'Selecciona un canal de texto válido.', ephemeral: true });
    db.setLogChannel(interaction.guild.id, canal.id);
    await interaction.reply({ content: `Canal de logs establecido: ${canal}`, ephemeral: true });
  }
};