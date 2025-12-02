const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-dinero')
    .setDescription('Comando de administrador para gestionar la economía')
    .addSubcommand(sub =>
        sub.setName('agregar')
           .setDescription('Añade monedas a un usuario')
           .addUserOption(u => u.setName('usuario').setDescription('Usuario').setRequired(true))
           .addIntegerOption(i => i.setName('cantidad').setDescription('Cantidad a añadir').setRequired(true))
    )
    .addSubcommand(sub =>
        sub.setName('quitar')
           .setDescription('Quita monedas a un usuario')
           .addUserOption(u => u.setName('usuario').setDescription('Usuario').setRequired(true))
           .addIntegerOption(i => i.setName('cantidad').setDescription('Cantidad a quitar').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo administradores

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');

    if (cantidad <= 0) return interaction.reply({ content: 'La cantidad debe ser mayor a 0.', ephemeral: true });

    if (sub === 'agregar') {
        const nuevoSaldo = db.addBalance(interaction.guild.id, target.id, cantidad);
        return interaction.reply({ content: `✅ Se han añadido **${cantidad}** monedas a **${target.tag}**. Nuevo saldo: ${nuevoSaldo}.` });
    }

    if (sub === 'quitar') {
        const nuevoSaldo = db.addBalance(interaction.guild.id, target.id, -cantidad);
        return interaction.reply({ content: `✅ Se han retirado **${cantidad}** monedas de **${target.tag}**. Nuevo saldo: ${nuevoSaldo}.` });
    }
  }
};