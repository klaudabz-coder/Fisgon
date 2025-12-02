const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-cartas')
    .setDescription('Crea cartas y sets personalizados')
    .addSubcommand(sub => 
        sub.setName('crear-set')
           .setDescription('Crea una nueva colección de cartas')
           .addStringOption(o => o.setName('id').setDescription('ID corto (ej: halloween)').setRequired(true))
           .addStringOption(o => o.setName('nombre').setDescription('Nombre visible').setRequired(true))
           .addIntegerOption(o => o.setName('precio').setDescription('Precio del sobre').setRequired(true))
    )
    .addSubcommand(sub => 
        sub.setName('crear-carta')
           .setDescription('Añade una carta a un set')
           .addStringOption(o => o.setName('nombre').setDescription('Nombre de la carta').setRequired(true))
           .addStringOption(o => o.setName('set_id').setDescription('ID del set al que pertenece').setRequired(true))
           .addStringOption(o => o.setName('rareza').setDescription('Rareza').setRequired(true)
                .addChoices({name:'Común',value:'Common'},{name:'Rara',value:'Rare'},{name:'Épica',value:'Epic'},{name:'Legendaria',value:'Legendary'}))
           .addStringOption(o => o.setName('rol').setDescription('Rol de combate').setRequired(true)
                .addChoices({name:'Luchador',value:'fighter'},{name:'Soporte',value:'support'}))
           .addStringOption(o => o.setName('emoji').setDescription('Emoji representativo').setRequired(false))
           .addStringOption(o => o.setName('imagen').setDescription('URL de imagen').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'crear-set') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
        const nombre = interaction.options.getString('nombre');
        const precio = interaction.options.getInteger('precio');

        db.createSet(guildId, id, nombre, precio);
        return interaction.reply({ content: `✅ **Set Creado:** ${nombre} (ID: ${id}) - Precio: ${precio} monedas.` });
    }

    if (sub === 'crear-carta') {
        const setId = interaction.options.getString('set_id');

        // Verificar si el set existe
        const sets = db.getSets(guildId);
        if (setId !== 'default' && !sets.find(s => s.id === setId)) {
            return interaction.reply({ content: `❌ El set con ID \`${setId}\` no existe. Crea el set primero o usa 'default'.`, ephemeral: true });
        }

        const cardData = {
            name: interaction.options.getString('nombre'),
            set: setId,
            rarity: interaction.options.getString('rareza'),
            role: interaction.options.getString('rol'),
            emoji: interaction.options.getString('emoji') || '🃏',
            image: interaction.options.getString('imagen') || '',
            // Stats se generan en cardRegistry al leerla, pero guardamos esto para saber que es custom
            isCustom: true
        };

        db.createCustomCard(guildId, cardData);
        return interaction.reply({ content: `✅ **Carta Creada:** ${cardData.emoji} ${cardData.name} (${cardData.rarity}) añadida al set **${setId}**.` });
    }
  }
};