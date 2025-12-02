const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

// Lista de categorías que NO se deben tocar para no romper el bot
const CATEGORIAS_PROTEGIDAS = ['config', 'tickets']; 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-modulos')
    .setDescription('Activa/Desactiva categorías o restringe su uso a roles')
    .addSubcommand(sub => 
        sub.setName('estado')
           .setDescription('Activa o desactiva una categoría completa')
           .addStringOption(o => o.setName('categoria').setDescription('Nombre de la carpeta/categoría (ej: economy, games)').setRequired(true))
           .addBooleanOption(o => o.setName('activo').setDescription('True para activar, False para desactivar').setRequired(true))
    )
    .addSubcommand(sub => 
        sub.setName('rol')
           .setDescription('Establece qué rol es necesario para usar una categoría')
           .addStringOption(o => o.setName('categoria').setDescription('Nombre de la categoría').setRequired(true))
           .addRoleOption(o => o.setName('rol').setDescription('Rol requerido (Déjalo vacío para quitar restricción)').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const categoria = interaction.options.getString('categoria').toLowerCase();

    // Protección
    if (CATEGORIAS_PROTEGIDAS.includes(categoria)) {
        return interaction.reply({ content: `⚠️ La categoría **${categoria}** es esencial y no se puede modificar.`, ephemeral: true });
    }

    if (sub === 'estado') {
        const activo = interaction.options.getBoolean('activo');
        db.setCategoryStatus(interaction.guild.id, categoria, activo);

        const estadoTexto = activo ? '✅ ACTIVADO' : '❌ DESACTIVADO';
        return interaction.reply({ content: `Módulo **${categoria}** ha sido ${estadoTexto}.`, ephemeral: true });
    }

    if (sub === 'rol') {
        const rol = interaction.options.getRole('rol');

        if (rol) {
            db.setCategoryRole(interaction.guild.id, categoria, rol.id);
            return interaction.reply({ content: `🔒 Ahora se requiere el rol **${rol.name}** para usar comandos de **${categoria}**.`, ephemeral: true });
        } else {
            // Si no selecciona rol, quitamos la restricción (pasamos null)
            db.setCategoryRole(interaction.guild.id, categoria, null);
            return interaction.reply({ content: `🔓 Se ha eliminado la restricción de rol para **${categoria}**. Ahora todos pueden usarla.`, ephemeral: true });
        }
    }
  }
};