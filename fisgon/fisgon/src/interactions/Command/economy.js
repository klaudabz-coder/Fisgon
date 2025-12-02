const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economia')
        .setDescription('Jugar al juego de economía en tu servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría economía')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('agregarobjeto')
                .setDescription('Agregar un objeto de rol a la tienda de economía')
                .addRoleOption(option => option.setName('role').setDescription('Selecciona un rol').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))

        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('agregardinero')
                .setDescription('Agregar dinero a un usuario')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Ver tu balance')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mendigar')
                .setDescription('Mendigar por dinero')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('comprar')
                .setDescription('Comprar objetos en la tienda del Bot')

        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('limpiar')
                .setDescription('Limpiar la economía')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('crimen')
                .setDescription('Cometer un crimen')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('diario')
                .setDescription('Reclamar tu dinero diario')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('eliminarobjeto')
                .setDescription('Eliminar un objeto de rol de la tienda de economía')
                .addRoleOption(option => option.setName('role').setDescription('Selecciona un rol').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('depositar')
                .setDescription('Depositar dinero en el banco')
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pescar')
                .setDescription('Pescar algunos peces')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('porhora')
                .setDescription('Reclamar tu dinero por hora')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cazar')
                .setDescription('Cazar algunos animales')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mensual')
                .setDescription('Reclamar tu dinero mensual')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pagar')
                .setDescription('Pagar a un usuario')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('regalo')
                .setDescription('Obtener un regalo semanal')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('quitardinero')
                .setDescription('Quitar dinero de un usuario')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('robar')
                .setDescription('Robar a un usuario')
                .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tienda')
                .setDescription('Mostrar la tienda de este servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('semanal')
                .setDescription('Reclamar tu dinero semanal')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('retirar')
                .setDescription('Retirar tu dinero')
                .addNumberOption(option => option.setName('amount').setDescription('Ingresa una cantidad').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('trabajar')
                .setDescription('Ir a trabajar')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('anual')
                .setDescription('Reclamar tu dinero anual')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clasificacion')
                .setDescription('Ver la clasificación de economía')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('El tipo de clasificación que quieres')
                        .setRequired(true)
                        .addChoices(
                            {name: 'Dinero', value: 'money'},
                            {name: 'Banco', value: 'bank'}
                        )
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
        client.loadSubcommands(client, interaction, args);
    },
};
