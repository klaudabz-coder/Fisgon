const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mendigar')
    .setDescription('Pide una pequeña cantidad de monedas (probabilidad)'),
  async execute(interaction) {
    const chance = Math.random();
    if (chance < 0.35) {
      return interaction.reply({ content: 'Nadie te ayudó esta vez. 😕' });
    }
    const amount = Math.floor(Math.random() * 100) + 20;
    db.addBalance(interaction.guild.id, interaction.user.id, amount);
    return interaction.reply({ content: `Alguien te dio **${amount}** monedas. Gracias.` });
  }
};