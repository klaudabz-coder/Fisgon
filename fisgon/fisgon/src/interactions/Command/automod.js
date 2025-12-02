const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const { ChannelType } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Gestionar la moderación automática')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de moderación automática')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antiinvitacion')
                .setDescription('Activar/desactivar anti-invitaciones')
                .addBooleanOption(option => option.setName('active').setDescription('Selecciona un valor').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antienlaces')
                .setDescription('Activar/desactivar anti-enlaces')
                .addBooleanOption(option => option.setName('active').setDescription('Selecciona un valor').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antispam')
                .setDescription('Activar/desactivar anti-spam')
                .addBooleanOption(option => option.setName('active').setDescription('Selecciona un valor').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('canalenlaces')
                .setDescription('Añadir un canal donde se permite enviar enlaces')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('¿Qué quieres hacer con el canal?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Añadir', value: 'add' },
                            { name: 'Eliminar', value: 'remove' }
                        )
                )
                .addChannelOption(option => option.setName('channel').setDescription('Selecciona un canal').setRequired(true).addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommandGroup(group =>
            group
                .setName('listanegra')
                .setDescription('Gestionar la lista negra')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('mostrar')
                        .setDescription('Mostrar toda la lista negra')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('agregar')
                        .setDescription('Agregar una palabra a la lista negra')
                        .addStringOption(option => option.setName('word').setDescription('La palabra para la lista negra').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('eliminar')
                        .setDescription('Eliminar una palabra de la lista negra')
                        .addStringOption(option => option.setName('word').setDescription('La palabra para la lista negra').setRequired(true))
                )
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
