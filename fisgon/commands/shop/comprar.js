const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compra un artículo de la tienda del servidor usando la moneda')
    .addStringOption(s => s.setName('item').setDescription('ID del artículo').setRequired(true)),
  async execute(interaction) {
    const itemId = interaction.options.getString('item');
    const item = db.getShopItem(interaction.guild.id, itemId);
    if (!item) return interaction.reply({ content: 'Artículo no encontrado.', ephemeral: true });
    const balance = db.getBalance(interaction.guild.id, interaction.user.id);
    if (balance < item.precio) return interaction.reply({ content: 'No tienes suficiente saldo.', ephemeral: true });
    db.addBalance(interaction.guild.id, interaction.user.id, -item.precio);
    db.addToInventory(interaction.guild.id, interaction.user.id, itemId, 1);
    return interaction.reply({ content: `Has comprado **${item.nombre}** por ${item.precio} monedas.` });
  }
};