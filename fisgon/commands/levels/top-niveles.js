const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-niveles')
    .setDescription('Muestra el top de niveles del servidor (por XP)'),
  async execute(interaction) {
    const rows = db.db.prepare('SELECT user_id, xp FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT 10').all(interaction.guild.id);
    if (!rows || rows.length === 0) return interaction.reply({ content: 'No hay datos de niveles aún.', ephemeral: true });
    let texto = '**Top niveles:**\n';
    for (let i=0;i<rows.length;i++) {
      texto += `${i+1}. <@${rows[i].user_id}> — ${rows[i].xp} XP\n`;
    }
    return interaction.reply({ content: texto });
  }
};