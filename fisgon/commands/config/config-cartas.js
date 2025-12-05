const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getAllCards, getAvailableSets } = require('../../utils/cardRegistry');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-cartas')
    .setDescription('Gestión completa del TCG (Cartas y Sets)')

    // --- CREAR SET ---
    .addSubcommand(sub => 
        sub.setName('set-crear')
           .setDescription('Crea una nueva colección')
           .addStringOption(o => o.setName('id').setDescription('ID único (ej: dragones)').setRequired(true))
           .addStringOption(o => o.setName('nombre').setDescription('Nombre visible').setRequired(true))
           .addIntegerOption(o => o.setName('precio').setDescription('Precio del sobre').setRequired(true))
    )
    // --- BORRAR SET ---
    .addSubcommand(sub => 
        sub.setName('set-borrar')
           .setDescription('Elimina un set existente')
           .addStringOption(o => o.setName('id').setDescription('ID del set').setRequired(true))
    )
    // --- CREAR CARTA ---
    .addSubcommand(sub => 
        sub.setName('carta-crear')
           .setDescription('Crea una carta nueva')
           .addStringOption(o => o.setName('nombre').setDescription('Nombre de la carta').setRequired(true))
           .addStringOption(o => o.setName('set_id').setDescription('ID del set').setRequired(true))
           .addStringOption(o => o.setName('rareza').setDescription('Rareza').setRequired(true)
                .addChoices({name:'Común',value:'Common'},{name:'Rara',value:'Rare'},{name:'Épica',value:'Epic'},{name:'Legendaria',value:'Legendary'}))
           .addStringOption(o => o.setName('imagen').setDescription('URL de la imagen (JPG/PNG)').setRequired(true))
           .addIntegerOption(o => o.setName('hp').setDescription('Puntos de Vida (HP)').setRequired(true))
           .addIntegerOption(o => o.setName('atk').setDescription('Puntos de Ataque (ATK)').setRequired(true))
           // CAMBIO: Subtipo en lugar de Tipo genérico, y rol ya no se pide porque se define por slot en batalla
           .addStringOption(o => o.setName('subtipo').setDescription('Ej: Fuego, Guerrero, Dragón...').setRequired(true))
    )
    // --- EDITAR CARTA (HABILIDADES) ---
    .addSubcommand(sub => 
        sub.setName('carta-habilidades')
           .setDescription('Configura las habilidades de una carta')
           .addStringOption(o => o.setName('carta_id').setDescription('ID de la carta (ver en /cartas-info)').setRequired(true))
           .addStringOption(o => o.setName('hab_ataque_nom').setDescription('Nombre Habilidad Ataque').setRequired(true))
           .addNumberOption(o => o.setName('hab_ataque_power').setDescription('Multiplicador de daño (ej: 1.5)').setRequired(true))
           .addStringOption(o => o.setName('hab_defensa_nom').setDescription('Nombre Habilidad Defensa').setRequired(true))
           .addIntegerOption(o => o.setName('hab_defensa_power').setDescription('Escudo/Cura otorgado').setRequired(true))
           // CAMBIO: Eliminada la opción de Sincronía
    )
    // --- BORRAR CARTA ---
    .addSubcommand(sub => 
        sub.setName('carta-borrar')
           .setDescription('Elimina una carta del sistema')
           .addStringOption(o => o.setName('carta_id').setDescription('ID de la carta').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ... (Lógica de Sets igual que antes) ...
    if (sub === 'set-crear') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
        const nombre = interaction.options.getString('nombre');
        const precio = interaction.options.getInteger('precio');
        db.createSet(guildId, id, nombre, precio);
        return interaction.reply({ content: `✅ Set **${nombre}** creado.` });
    }

    if (sub === 'set-borrar') {
        const id = interaction.options.getString('id');
        db.deleteSet(guildId, id);
        return interaction.reply({ content: `🗑️ Set con ID **${id}** eliminado.` });
    }

    // --- LOGICA DE CARTAS ---
    if (sub === 'carta-crear') {
        const setId = interaction.options.getString('set_id');
        const sets = getAvailableSets(guildId);

        if (!sets.find(s => s.id === setId)) {
            return interaction.reply({ content: `❌ El set \`${setId}\` no existe.`, ephemeral: true });
        }

        const cardData = {
            name: interaction.options.getString('nombre'),
            set: setId,
            rarity: interaction.options.getString('rareza'),
            image: interaction.options.getString('imagen'),
            subtype: interaction.options.getString('subtipo'), // NUEVO CAMPO
            stats: {
                hp: interaction.options.getInteger('hp'),
                atk: interaction.options.getInteger('atk'),
                def: Math.floor(interaction.options.getInteger('hp') / 10),
                spd: 10
            },
            skills: {
                atk: { name: 'Ataque Fuerte', power: 1.2 },
                def: { name: 'Guardia', power: 50 }
            },
            emoji: '🃏'
        };

        const created = db.createCustomCard(guildId, cardData);
        return interaction.reply({ content: `✅ **Carta Creada!**\nID: \`${created.id}\`\nSubtipo: ${cardData.subtype}\nUsa \`/config-cartas carta-habilidades\` para configurar sus poderes.` });
    }

    if (sub === 'carta-habilidades') {
        const cardId = interaction.options.getString('carta_id');
        const allCards = getAllCards(guildId);
        const exists = allCards.find(c => c.id === cardId);
        if (!exists) return interaction.reply({ content: '❌ Carta no encontrada.', ephemeral: true });

        const updates = {
            skills: {
                atk: { name: interaction.options.getString('hab_ataque_nom'), power: interaction.options.getNumber('hab_ataque_power') },
                def: { name: interaction.options.getString('hab_defensa_nom'), power: interaction.options.getInteger('hab_defensa_power') }
            }
        };
        // Ya no guardamos synergy

        const updated = db.updateCustomCard(guildId, cardId, updates);

        if (updated) return interaction.reply({ content: `✅ Habilidades actualizadas para **${updated.name}**.` });
        else return interaction.reply({ content: '❌ No se pudo actualizar.', ephemeral: true });
    }

    if (sub === 'carta-borrar') {
         const cardId = interaction.options.getString('carta_id');
         const deleted = db.deleteCustomCard(guildId, cardId);
         if (deleted) return interaction.reply({ content: `🗑️ Carta eliminada.` });
         else return interaction.reply({ content: '❌ Carta no encontrada.', ephemeral: true });
    }
  }
};