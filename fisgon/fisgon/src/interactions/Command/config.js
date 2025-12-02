const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const { ChannelType } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configuracion')
        .setDescription('Ajustar el bot a tu gusto')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría configuración')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('niveles')
                .setDescription('Activar/desactivar niveles')
                .addBooleanOption(option => option.setName('boolean').setDescription('Selecciona un valor').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('establecercolor')
                .setDescription('Establecer un color de embed personalizado')
                .addStringOption(option => option.setName("color").setDescription("Ingresa un color hexadecimal").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('establecerverificacion')
                .setDescription('Configurar el panel de verificación')
                .addBooleanOption(option => option.setName('enable').setDescription('Selecciona un valor').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('Selecciona un canal').setRequired(true).addChannelTypes(ChannelType.GuildText))
                .addRoleOption(option => option.setName('role').setDescription('Selecciona un rol').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('establecernombrecanal')
                .setDescription('Establecer un nombre de canal personalizado para estadísticas del servidor')
                .addStringOption(option => option.setName("name").setDescription("Ingresa un nombre para el canal o envía AYUDA para los argumentos").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mensajenivel')
                .setDescription('Establecer el mensaje de nivel del bot')
                .addStringOption(option => option.setName("message").setDescription("Ingresa un mensaje para los niveles o envía AYUDA para los argumentos").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mensajebienvenida')
                .setDescription('Establecer el mensaje de bienvenida')
                .addStringOption(option => option.setName("message").setDescription("Ingresa un mensaje de bienvenida o envía AYUDA para los argumentos").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mensajedespedida')
                .setDescription('Establecer el mensaje de despedida')
                .addStringOption(option => option.setName("message").setDescription("Ingresa un mensaje de despedida o envía AYUDA para los argumentos").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mensajeticket')
                .setDescription('Establecer el mensaje de ticket del bot')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Tipo de mensaje de ticket')
                        .setRequired(true)
                        .addChoices(
                            { name: 'abrir', value: 'open' },
                            { name: 'cerrarDM', value: 'close' }
                        )
                )
                .addStringOption(option => option.setName("message").setDescription("Ingresa un mensaje para el ticket").setRequired(true))
        )
    ,

    /** 
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async (client, interaction, args) => {
        await interaction.deferReply({ fetchReply: true });
        client.loadSubcommands(client, interaction, args);
    },
};
