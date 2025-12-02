const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets-configurar')
    .setDescription('Configura el sistema de tickets del servidor (categoría y rol de soporte)')
    .addChannelOption(opt => opt.setName('categoria').setDescription('Categoría donde se crearán los tickets').setRequired(true))
    .addRoleOption(opt => opt.setName('rolsoporte').setDescription('Rol que tendrá acceso a los tickets').setRequired(true))
    .addChannelOption(opt => opt.setName('transcript').setDescription('Canal para enviar transcripciones (opcional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const categoria = interaction.options.getChannel('categoria');
    const rol = interaction.options.getRole('rolsoporte');
    const transcript = interaction.options.getChannel('transcript');

    if (categoria.type !== ChannelType.GuildCategory) return interaction.reply({ content: 'La opción "categoria" debe ser una categoría de canales.', ephemeral: true });

    db.setTicketConfig(interaction.guild.id, categoria.id, rol.id, transcript ? transcript.id : null);
    return interaction.reply({ content: `Sistema de tickets configurado.\nCategoría: ${categoria.name}\nRol de soporte: ${rol.name}${transcript ? `\nCanal de transcripciones: ${transcript}` : ''}`, ephemeral: true });
  }
};