const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nivel-recompensa-fijar')
    .setDescription('Asigna un rol automático como recompensa cuando un usuario alcance un nivel')
    .addIntegerOption(o => o.setName('nivel').setDescription('Nivel al que se dará el rol').setRequired(true))
    .addRoleOption(o => o.setName('rol').setDescription('Rol que se asignará').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const nivel = interaction.options.getInteger('nivel');
    const rol = interaction.options.getRole('rol');

    if (nivel < 1) return interaction.reply({ content: 'El nivel debe ser 1 o mayor.', ephemeral: true });

    db.setLevelRole(interaction.guild.id, nivel, rol.id);
    return interaction.reply({ content: `Se ha configurado que al alcanzar el nivel **${nivel}** se asigne el rol **${rol.name}**.`, ephemeral: true });
  }
};