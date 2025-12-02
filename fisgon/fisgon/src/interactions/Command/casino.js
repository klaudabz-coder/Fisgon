const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Jugar juegos de casino')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría casino')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blackjack')
                .setDescription('Jugar blackjack para ganar dinero')
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('crash')
                .setDescription('Más riesgo, más recompensa')
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ruleta')
                .setDescription('Jugar a la ruleta')
                .addStringOption(option => option.setName('color').setDescription('Ingresa un color hexadecimal').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tragamonedas')
                .setDescription('Jugar tragamonedas')
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
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
