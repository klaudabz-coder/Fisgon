const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorol')
    .setDescription('Establece un rol que se dará automáticamente a los nuevos miembros')
    .addRoleOption(option => 
        option.setName('rol')
            .setDescription('El rol a asignar (Selecciona "nada" para desactivar)')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Solo Admins/Mods

  async execute(interaction) {
    const rol = interaction.options.getRole('rol');

    // Validación básica: no podemos asignar un rol que sea más alto que el del bot
    const botMember = interaction.guild.members.me;
    if (rol.position >= botMember.roles.highest.position) {
        return interaction.reply({ content: '⚠️ No puedo asignar ese rol porque está por encima de mi rol (Fisgón).', ephemeral: true });
    }

    // Guardar en DB
    db.setAutoRole(interaction.guild.id, rol.id);

    return interaction.reply({ content: `✅ **Autorol configurado:** A partir de ahora, los nuevos miembros recibirán el rol **${rol.name}**.` });
  }
};