const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-niveles')
    .setDescription('Muestra el top de niveles del servidor (por XP)'),
  async execute(interaction) {
    // USAMOS LA NUEVA FUNCIÓN COMPATIBLE CON MAPS/FIREBASE
    const rows = db.getTopLevels(interaction.guild.id);

    if (!rows || rows.length === 0) return interaction.reply({ content: 'No hay datos de niveles aún.', ephemeral: true });

    let texto = '**🏆 Top Niveles:**\n';
    for (let i = 0; i < rows.length; i++) {
      texto += `**${i+1}.** <@${rows[i].user_id}> — Nivel ${rows[i].level} (${rows[i].xp} XP)\n`;
    }

    return interaction.reply({ content: texto });
  }
};