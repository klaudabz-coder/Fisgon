const { SlashCommandBuilder } = require('discord.js');
const { crearTicket } = require('../../utils/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abrir-ticket')
    .setDescription('Abre un ticket (si está configurado)')
    .addStringOption(s => s.setName('motivo').setDescription('Motivo del ticket').setRequired(false)),
  async execute(interaction, client) {
    const motivo = interaction.options.getString('motivo') || 'Sin motivo';
    try {
      const chan = await crearTicket(client, interaction.guild, interaction.user, motivo);
      return interaction.reply({ content: `Ticket creado: ${chan}`, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `No se pudo crear el ticket: ${err.message}`, ephemeral: true });
    }
  }
};