const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

// Lista de categorías que NO se deben tocar para no romper el bot
const CATEGORIAS_PROTEGIDAS = ['config', 'tickets']; 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-modulos')
    .setDescription('Gestiona los módulos y permisos del bot')
    // --- NUEVA OPCIÓN: LISTA ---
    .addSubcommand(sub => 
        sub.setName('lista')
           .setDescription('Muestra el estado actual de todos los módulos')
    )
    // ---------------------------
    .addSubcommand(sub => 
        sub.setName('estado')
           .setDescription('Activa o desactiva una categoría completa')
           .addStringOption(o => o.setName('categoria').setDescription('Nombre de la carpeta (ej: economy)').setRequired(true))
           .addBooleanOption(o => o.setName('activo').setDescription('True para activar, False para desactivar').setRequired(true))
    )
    .addSubcommand(sub => 
        sub.setName('rol')
           .setDescription('Establece qué rol es necesario para usar una categoría')
           .addStringOption(o => o.setName('categoria').setDescription('Nombre de la categoría').setRequired(true))
           .addRoleOption(o => o.setName('rol').setDescription('Rol requerido (vacío para acceso libre)').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // --- LÓGICA PARA VER LA LISTA ---
    if (sub === 'lista') {
        // Obtenemos todas las categorías únicas leyendo los comandos cargados
        const comandos = interaction.client.commands;
        // Creamos una lista única de categorías (quitando undefined o vacíos)
        const categorias = [...new Set(comandos.map(cmd => cmd.category))].filter(c => c);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración de Módulos')
            .setColor('#2f3136')
            .setDescription('Aquí tienes el estado actual de cada sistema del bot.')
            .setFooter({ text: 'Usa /config-modulos estado o /config-modulos rol para cambiar.' });

        // Recorremos cada categoría para ver su config
        for (const cat of categorias) {
            const config = db.getCategoryConfig(interaction.guild.id, cat);

            // Iconos de estado
            const estadoIcon = config.enabled !== false ? '✅' : '🔴'; // Activado por defecto
            const estadoTexto = config.enabled !== false ? 'Activo' : 'Desactivado';

            // Info de rol
            const rolInfo = config.required_role ? `<@&${config.required_role}>` : '🌍 Todos';

            // Marca si es protegida
            const esProtegida = CATEGORIAS_PROTEGIDAS.includes(cat) ? '🛡️ *(Sistema)*' : '';

            embed.addFields({
                name: `📂 ${cat.toUpperCase()} ${esProtegida}`,
                value: `Estado: **${estadoTexto}** ${estadoIcon}\nAcceso: ${rolInfo}`,
                inline: true
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --- LÓGICA DE EDICIÓN (ESTADO / ROL) ---
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
            // Si no selecciona rol, quitamos la restricción
            db.setCategoryRole(interaction.guild.id, categoria, null);
            return interaction.reply({ content: `🔓 Se ha eliminado la restricción de rol para **${categoria}**. Ahora todos pueden usarla.`, ephemeral: true });
        }
    }
  }
};