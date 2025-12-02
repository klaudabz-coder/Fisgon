const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nivel-recompensa-remover')
    .setDescription('Elimina la recompensa (rol) configurada para un nivel')
    .addIntegerOption(o => o.setName('nivel').setDescription('Nivel a eliminar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const nivel = interaction.options.getInteger('nivel');
    db.removeLevelRole(interaction.guild.id, nivel);
    return interaction.reply({ content: `Se ha eliminado la configuración de rol para el nivel ${nivel}.`, ephemeral: true });
  }
};