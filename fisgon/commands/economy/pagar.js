const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Paga a otro usuario usando la moneda del servidor')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a pagar').setRequired(true))
    .addIntegerOption(i => i.setName('cantidad').setDescription('Cantidad a pagar').setRequired(true)),
  async execute(interaction) {
    const to = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    if (to.id === interaction.user.id) return interaction.reply({ content: 'No puedes pagarte a ti mismo.', ephemeral: true });
    if (cantidad <= 0) return interaction.reply({ content: 'Cantidad inválida.', ephemeral: true });
    const balance = db.getBalance(interaction.guild.id, interaction.user.id);
    if (balance < cantidad) return interaction.reply({ content: 'No tienes suficiente saldo.', ephemeral: true });
    db.addBalance(interaction.guild.id, interaction.user.id, -cantidad);
    db.addBalance(interaction.guild.id, to.id, cantidad);
    return interaction.reply({ content: `Has pagado ${cantidad} monedas a **${to.tag}**.` });
  }
};