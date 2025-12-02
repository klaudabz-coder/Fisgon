const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Gestionar los anuncios del servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría anuncios')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('crear')
                .setDescription('Hacer un anuncio')
                .addChannelOption(option => option.setName('channel').setDescription('Selecciona un canal').setRequired(true).addChannelTypes(ChannelType.GuildText).addChannelTypes(ChannelType.GuildNews))
                .addStringOption(option => option.setName('message').setDescription('Tu mensaje de anuncio').setRequired(true)),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('editar')
                .setDescription('Editar un anuncio')
                .addStringOption(option => option.setName('id').setDescription('ID del anuncio que quieres cambiar').setRequired(true))
                .addStringOption(option => option.setName('message').setDescription('Tu mensaje de anuncio').setRequired(true)),
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
            flags: [Discord.PermissionsBitField.Flags.ManageMessages],
            perms: [Discord.PermissionsBitField.Flags.ManageMessages]
        }, interaction)

        if (perms == false) return;

        client.loadSubcommands(client, interaction, args);
    },
};
