const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda-agregar')
    .setDescription('Agrega o actualiza un artículo en la tienda del servidor')
    .addStringOption(o => o.setName('id').setDescription('ID único del artículo').setRequired(true))
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del artículo').setRequired(true))
    .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(true))
    .addIntegerOption(o => o.setName('precio').setDescription('Precio en monedas').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const id = interaction.options.getString('id');
    const nombre = interaction.options.getString('nombre');
    const descripcion = interaction.options.getString('descripcion');
    const precio = interaction.options.getInteger('precio');
    db.addShopItem(interaction.guild.id, id, nombre, descripcion, precio);
    return interaction.reply({ content: `Artículo **${nombre}** agregado/actualizado en la tienda.` , ephemeral: true});
  }
};