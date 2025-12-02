const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Información sobre el bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Obtener información sobre el bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Ver el ping del bot en ms')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cambios')
                .setDescription('Obtener los registros de cambios del bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('donar')
                .setDescription('Obtener el enlace de donación del Bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enlaces')
                .setDescription('Obtener un mensaje con todos los enlaces del Bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('propietario')
                .setDescription('Obtener información sobre el propietario')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('redes')
                .setDescription('Obtener las redes sociales del Bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('soporte')
                .setDescription('Obtener una invitación del servidor de soporte')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tiempoactivo')
                .setDescription('Mostrar el tiempo activo del bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('votar')
                .setDescription('Ver si has votado')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('opinion')
                .setDescription('Enviar tu opinión sobre el bot a los desarrolladores')
                .addStringOption(option => option.setName("feedback").setDescription("Tu opinión").setRequired(true))
        ),

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
