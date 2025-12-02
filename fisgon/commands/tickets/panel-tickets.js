const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets-panel')
    .setDescription('Envía el panel de tickets con botón para abrir uno')
    .addStringOption(s => s.setName('mensaje').setDescription('Mensaje del panel').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const texto = interaction.options.getString('mensaje') || 'Si necesitas ayuda, pulsa el botón para abrir un ticket.';
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('ticket_create').setLabel('🎫 Abrir ticket').setStyle(ButtonStyle.Success)
      );
    await interaction.reply({ content: 'Panel de tickets enviado.', ephemeral: true });
    await interaction.channel.send({ content: texto, components: [row] });
  }
};