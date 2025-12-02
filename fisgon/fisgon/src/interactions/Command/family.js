const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

const Schema = require("../../database/models/music");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('familia')
        .setDescription('Crear una familia en Bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría familia')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adoptar')
                .setDescription('Adoptar a un miembro')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('eliminar')
                .setDescription('Eliminar tu familia'),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('repudiar')
                .setDescription('Repudiar a uno de tus hijos o un padre')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true)),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('divorciar')
                .setDescription('Divorciarte de tu pareja')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true)),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('familia')
                .setDescription('Ver quién está en la familia de alguien')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(false)),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('proponer')
                .setDescription('Casarte con un miembro')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true)),
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
