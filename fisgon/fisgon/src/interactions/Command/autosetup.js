const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoconfiguracion')
        .setDescription('Dejar que el bot configure automáticamente')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de configuración automática')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('registros')
                .setDescription('Configurar los registros del servidor')
                .addStringOption(option =>
                    option.setName('setup')
                        .setDescription('La configuración que quieres')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Registros del servidor', value: 'serverLogs' },
                            { name: 'Registros de niveles', value: 'levelLogs' },
                            { name: 'Registros de mejoras', value: 'boostLogs' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('diversion')
                .setDescription('Configurar los canales de diversión del servidor')
                .addStringOption(option =>
                    option.setName('setup')
                        .setDescription('La configuración que quieres')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Cumpleaños', value: 'birthdays' },
                            { name: 'Chatbot', value: 'chatbot' },
                            { name: 'Reseñas', value: 'reviews' },
                            { name: 'Sugerencias', value: 'suggestions' },
                            { name: 'Tablero de estrellas', value: 'starboard' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('juegos')
                .setDescription('Configurar los canales de juegos del servidor')
                .addStringOption(option =>
                    option.setName('setup')
                        .setDescription('La configuración que quieres')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Conteo', value: 'counting' },
                            { name: 'Adivina el número', value: 'gtn' },
                            { name: 'Adivina la palabra', value: 'gtw' },
                            { name: 'Serpiente de palabras', value: 'wordsnake' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bienvenida')
                .setDescription('Configurar el sistema de bienvenida')
                .addStringOption(option =>
                    option.setName('setup')
                        .setDescription('La configuración que quieres')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Canal de bienvenida', value: 'welcomechannel' },
                            { name: 'Rol de bienvenida', value: 'welcomerole' },
                            { name: 'Canal de despedida', value: 'leavechannel' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('vozpersonalizada')
                .setDescription('Configurar los canales de voz personalizados del servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('paneltickets')
                .setDescription('Configurar el panel de tickets del servidor')
        )
    ,

    /** 
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async (client, interaction, args) => {
        await interaction.deferReply({ fetchReply: true });
        const perms = await client.checkUserPerms({
            flags: [Discord.PermissionsBitField.Flags.Administrator],
            perms: [Discord.PermissionsBitField.Flags.Administrator]
        }, interaction)

        if (perms == false) return;

        client.loadSubcommands(client, interaction, args);
    },
};
