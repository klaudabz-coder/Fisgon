const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diversion')
        .setDescription('Ejecutar comandos divertidos en Bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayuda')
                .setDescription('Obtén información sobre los comandos de la categoría diversión')
        )

        .addSubcommandGroup((group) =>
            group
                .setName('meme')
                .setDescription('Ver todos los comandos de memes divertidos en Bot')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('confundido')
                        .setDescription('Reaccionar con un meme de Nick Young confundido')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('tasainteligencia')
                        .setDescription('Ver qué tan inteligente eres')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('dinocromo')
                        .setDescription('Dinosaurio en Chrome')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('tasagamer')
                        .setDescription('Ver qué tan gamer épico eres')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('quetangay')
                        .setDescription('Ver qué tan gay eres')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('insultar')
                        .setDescription('Insultar a un usuario')
                        .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('tasasimp')
                        .setDescription('Ver qué tan simp eres')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('tasaapestoso')
                        .setDescription('Ver qué tan apestoso eres')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('rickroll')
                        .setDescription('Obtener un rickroll')
                )
        )

        .addSubcommandGroup((group) =>
            group
                .setName('usuario')
                .setDescription('Ver todos los comandos de usuario divertidos en Bot')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('hackear')
                        .setDescription('Hackear a tus amigos o enemigos')
                        .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('abrazar')
                        .setDescription('Dar un abrazo a un usuario')
                        .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('matar')
                        .setDescription('Matar a un usuario')
                        .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('medidoramor')
                        .setDescription('Ver cuánto encajas con alguien')
                        .addUserOption(option => option.setName('user1').setDescription('Selecciona un usuario').setRequired(true))
                        .addUserOption(option => option.setName('user2').setDescription('Selecciona un usuario').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('sudo')
                        .setDescription('Decir algo como otra persona')
                        .addUserOption(option => option.setName('user').setDescription('Selecciona un usuario').setRequired(true))
                        .addStringOption(option => option.setName('text').setDescription('Ingresa un texto').setRequired(true))
                )
        )

        .addSubcommandGroup((group) =>
            group
                .setName('texto')
                .setDescription('Ver todos los comandos de texto divertidos en Bot')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('ascii')
                        .setDescription('Crear texto ASCII')
                        .addStringOption(option => option.setName('text').setDescription('Ingresa un texto').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('gif')
                        .setDescription('Buscar un gif')
                        .addStringOption(option => option.setName('text').setDescription('Ingresa un texto').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('invertir')
                        .setDescription('Invertir tu texto')
                        .addStringOption(option => option.setName('text').setDescription('Ingresa un texto').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('decir')
                        .setDescription('Hacer que el bot diga algo')
                        .addStringOption(option => option.setName('text').setDescription('Ingresa un texto').setRequired(true))
                )
        )

        .addSubcommandGroup((group) =>
            group
                .setName('extra')
                .setDescription('Ver todos los comandos extra divertidos en Bot')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('datopajaro')
                        .setDescription('Obtener un dato aleatorio sobre pájaros')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('datogato')
                        .setDescription('Obtener un dato aleatorio sobre gatos')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('datoperro')
                        .setDescription('Obtener un dato aleatorio sobre perros')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('dato')
                        .setDescription('Obtener un dato aleatorio')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('datokoala')
                        .setDescription('Obtener un dato aleatorio sobre koalas')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('datopanda')
                        .setDescription('Obtener un dato aleatorio sobre pandas')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('token')
                        .setDescription('Obtener mi token')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('relojmundial')
                        .setDescription('Muestra los relojes mundiales')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('navidad')
                        .setDescription('Ver cuántos días faltan para Navidad')
                )
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
