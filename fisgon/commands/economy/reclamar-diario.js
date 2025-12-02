const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reclamar-diario')
    .setDescription('Reclama tu recompensa diaria'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const ahora = Date.now();
    const last = db.getLastDaily(guildId, userId) || 0;
    const diaMs = 24 * 60 * 60 * 1000;
    if (ahora - last < diaMs) {
      const faltan = Math.ceil((diaMs - (ahora - last)) / (60*60*1000));
      return interaction.reply({ content: `Ya reclamaste hoy. Intenta en ${faltan} horas.`, ephemeral: true });
    }
    const recompensa = 500 + Math.floor(Math.random() * 201);
    db.addBalance(guildId, userId, recompensa);
    db.setLastDaily(guildId, userId, ahora);
    return interaction.reply({ content: `Has reclamado tu recompensa diaria: ${recompensa} monedas. 💰` });
  }
};