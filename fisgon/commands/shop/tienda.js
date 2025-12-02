const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda')
    .setDescription('Muestra los artículos disponibles en la tienda del servidor'),
  async execute(interaction) {
    const items = db.listShop(interaction.guild.id);
    if (!items || items.length === 0) return interaction.reply({ content: 'La tienda está vacía.', ephemeral: true });
    let texto = '**Tienda del servidor:**\n';
    for (const it of items) {
      texto += `• \`${it.item_id}\` - **${it.nombre}** — ${it.precio} monedas\n   ${it.descripcion}\n`;
    }
    return interaction.reply({ content: texto });
  }
};