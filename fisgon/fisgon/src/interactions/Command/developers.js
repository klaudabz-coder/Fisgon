const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

const model = require('../../database/models/badge');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('desarrolladores')
        .setDescription('Comandos para los desarrolladores del Bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría desarrolladores')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('eval')
                .setDescription('Obtener el resultado de un fragmento de código')
                .addStringOption(option => option.setName('code').setDescription('Tu código').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('insignia')
                .setDescription('Gestionar las insignias del bot')
                .addBooleanOption(option => option.setName('new').setDescription('Selecciona un valor').setRequired(true))
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                .addStringOption(option => option.setName('badge').setDescription('Elige tu insignia').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('banear')
                .setDescription('Gestionar los baneos del bot')
                .addBooleanOption(option => option.setName('new').setDescription('Selecciona un valor').setRequired(true))
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('creditos')
                .setDescription('Gestionar los créditos del bot')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('El tipo de créditos')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Añadir', value: 'add' },
                            { name: 'Eliminar', value: 'remove' }
                        )
                )
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Cantidad de créditos').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('argumentos')
                .setDescription('Publicar mensajes predefinidos')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Selecciona un mensaje')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Información', value: 'information' },
                            { name: 'Reglas', value: 'rules' },
                            { name: 'Solicitudes', value: 'applications' },
                            { name: 'Beneficios de mejora', value: 'boosterperks' },
                            { name: 'Enlaces', value: 'links' },
                            { name: 'Recompensas', value: 'rewards' },
                            { name: 'Nuestros bots', value: 'ourbots' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('servidores')
                .setDescription('Ver todos los servidores de este fragmento')
        )
    ,

    /** 
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async (client, interaction, args) => {
        model.findOne({ User: interaction.user.id }, async (err, data) => {
            if (interaction.user.id === process.env.OWNER_ID) {
                client.loadSubcommands(client, interaction, args);
            } else {
                return client.errNormal({
                    error: 'Only Bot developers are allowed to do this',
                    type: 'editreply'
                }, interaction)
            }
        })
    },
};
