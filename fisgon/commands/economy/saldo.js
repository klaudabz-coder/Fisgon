const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Muestra tu saldo o el de otro usuario')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a consultar')),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const balance = db.getBalance(interaction.guild.id, user.id);
    return interaction.reply({ content: `💰 **${user.tag}** tiene ${balance} monedas.` });
  }
};