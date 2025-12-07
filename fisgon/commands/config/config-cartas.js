const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');

module.exports = {
  // 1. DEFINICIÓN DEL COMANDO
  data: new SlashCommandBuilder()
    .setName('config-cartas')
    .setDescription('Gestión de Cartas TCG')
    .addSubcommand(sub => sub.setName('crear-wizard').setDescription('Asistente paso a paso para crear una carta'))
    .addSubcommand(sub => sub.setName('set-crear').setDescription('Crea una nueva colección')
        .addStringOption(o => o.setName('id').setDescription('ID único').setRequired(true))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre visible').setRequired(true))
        .addIntegerOption(o => o.setName('precio').setDescription('Precio del sobre').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('carta-borrar').setDescription('Elimina una carta')
        .addStringOption(o => o.setName('id').setDescription('Busca la carta por nombre').setRequired(true).setAutocomplete(true))
    )
    // --- NUEVO SUBCOMANDO: EDITAR ---
    .addSubcommand(sub => sub.setName('carta-editar').setDescription('Edita una carta existente')
        .addStringOption(o => o.setName('id').setDescription('Busca la carta a editar').setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName('nuevo_nombre').setDescription('Nuevo nombre (Opcional)').setRequired(false))
        .addIntegerOption(o => o.setName('nueva_hp').setDescription('Nueva vida (Opcional)').setRequired(false))
        .addIntegerOption(o => o.setName('nuevo_atk').setDescription('Nuevo ataque (Opcional)').setRequired(false))
        .addStringOption(o => o.setName('nueva_imagen').setDescription('Nueva URL de imagen (Opcional)').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // 2. AUTOCOMPLETADO
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    // El autocompletado funciona para 'carta-borrar' y 'carta-editar'
    if (focusedOption.name === 'id') {
        const guildId = interaction.guild.id;
        const customCards = db.getCustomCards(guildId);
        const busqueda = focusedOption.value.toLowerCase();

        const filtradas = customCards.filter(c => c.name.toLowerCase().includes(busqueda));

        await interaction.respond(
            filtradas.slice(0, 25).map(c => ({ name: c.name, value: c.id }))
        );
    }
  },

  // 3. EJECUCIÓN
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // --- LOGICA DE SETS ---
    if (sub === 'set-crear') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
        const nombre = interaction.options.getString('nombre');
        const precio = interaction.options.getInteger('precio');
        db.createSet(guildId, id, nombre, precio);
        return interaction.reply({ content: `✅ Set **${nombre}** creado.` });
    }

    if (sub === 'carta-borrar') {
        const id = interaction.options.getString('id');
        const res = db.deleteCustomCard(guildId, id);
        return interaction.reply({ content: res ? '🗑️ Carta eliminada correctamente.' : '❌ No se encontró una carta con ese ID.' });
    }

    // --- NUEVA LÓGICA: EDITAR CARTA ---
    if (sub === 'carta-editar') {
        const id = interaction.options.getString('id');
        const nuevoNombre = interaction.options.getString('nuevo_nombre');
        const nuevaHp = interaction.options.getInteger('nueva_hp');
        const nuevoAtk = interaction.options.getInteger('nuevo_atk');
        const nuevaImg = interaction.options.getString('nueva_imagen');

        // Buscar la carta actual
        const currentCards = db.getCustomCards(guildId);
        const carta = currentCards.find(c => c.id === id);

        if (!carta) {
            return interaction.reply({ content: '❌ No encontré esa carta. Asegúrate de seleccionarla del menú.', ephemeral: true });
        }

        // Preparar objeto de actualización
        const updateData = {};
        let cambios = [];

        if (nuevoNombre) { updateData.name = nuevoNombre; cambios.push('Nombre'); }
        if (nuevaImg) { updateData.image = nuevaImg; cambios.push('Imagen'); }

        // Para los stats, necesitamos fusionarlos con los existentes
        if (nuevaHp || nuevoAtk) {
            updateData.stats = {
                ...carta.stats, // Mantiene lo que no cambie
                hp: nuevaHp || carta.stats.hp,
                atk: nuevoAtk || carta.stats.atk
            };
            if (nuevaHp) cambios.push('HP');
            if (nuevoAtk) cambios.push('ATK');
        }

        if (Object.keys(updateData).length === 0) {
            return interaction.reply({ content: '⚠️ No has especificado ningún cambio.', ephemeral: true });
        }

        // Guardar cambios
        db.updateCustomCard(guildId, id, updateData);

        return interaction.reply({ content: `✅ **Carta Actualizada:** ${carta.name}\n📝 Cambios: ${cambios.join(', ')}.` });
    }

    // --- WIZARD DE CREACIÓN DE CARTAS (Tu código corregido anteriormente) ---
    if (sub === 'crear-wizard') {
        const sets = db.getSets(guildId);
        if (sets.length === 0) return interaction.reply({ content: '❌ Primero crea un Set usando `/config-cartas set-crear`.', ephemeral: true });

        const cartaTemp = { guild_id: guildId, skills: [] };

        // PASO 1: SELECCIONAR SET
        const rowSet = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('w_set').setPlaceholder('1. Selecciona el Set').addOptions(sets.map(s => ({ label: s.name, value: s.id })))
        );

        const msg = await interaction.reply({ content: '🃏 **Creador de Cartas - Paso 1:** Elige el Set.', components: [rowSet], fetchReply: true });
        const filter = i => i.user.id === interaction.user.id;

        try {
            // 1. SET
            const iSet = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
            cartaTemp.set = iSet.values[0];

            // PASO 2: MODAL DATOS BÁSICOS
            const modalBasic = new ModalBuilder().setCustomId('w_modal_basic').setTitle('Datos de la Carta');
            modalBasic.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nombre').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('type').setLabel('Tipo (Elemento/Rol)').setStyle(TextInputStyle.Short).setPlaceholder('Ej: Fuego, Guerrero').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sub').setLabel('Subtipo (Raza/Clase)').setStyle(TextInputStyle.Short).setPlaceholder('Ej: Dragón...').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hp').setLabel('Vida (HP)').setStyle(TextInputStyle.Short).setPlaceholder('Ej: 200').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('atk').setLabel('Ataque (ATK)').setStyle(TextInputStyle.Short).setPlaceholder('Ej: 50').setRequired(true))
            );

            await iSet.showModal(modalBasic);
            const iModal = await iSet.awaitModalSubmit({ time: 120000, filter });

            cartaTemp.name = iModal.fields.getTextInputValue('n');
            cartaTemp.type = iModal.fields.getTextInputValue('type');
            cartaTemp.subtype = iModal.fields.getTextInputValue('sub');
            cartaTemp.stats = {
                hp: parseInt(iModal.fields.getTextInputValue('hp')),
                atk: parseInt(iModal.fields.getTextInputValue('atk')),
                spd: 10
            };

            // PASO 3: SELECCIÓN DE RAREZA
            const rowRareza = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('w_rarity').setPlaceholder('Selecciona la Rareza').addOptions([
                    { label: 'Común', value: 'Common', description: 'Alta probabilidad', emoji: '⚪' },
                    { label: 'Rara', value: 'Rare', description: 'Probabilidad media', emoji: '🔵' },
                    { label: 'Épica', value: 'Epic', description: 'Probabilidad baja', emoji: '🟣' },
                    { label: 'Legendaria', value: 'Legendary', description: 'Muy difícil', emoji: '🟡' }
                ])
            );

            await iModal.reply({ 
                content: `✅ Datos básicos guardados.\n📊 **Paso 3:** Elige la rareza.`, 
                components: [rowRareza], 
                ephemeral: true 
            });

            const msgRareza = await iModal.fetchReply();
            const iRareza = await msgRareza.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect });

            cartaTemp.rarity = iRareza.values[0];

            // PASO 4: TIPO DE HABILIDAD
            const skillTypes = [
                { label: 'Daño Directo', value: 'dmg', description: 'Multiplicador de ataque' },
                { label: 'Agilidad (Pasiva)', value: 'agility', description: 'Cambiar carta no gasta turno' },
                { label: 'Inmunidad (Pasiva)', value: 'immunity', description: 'Inmune a un Subtipo específico' },
                { label: 'Curación', value: 'heal', description: 'Recupera HP' }
            ];

            const rowSkill = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('w_skill_type').setPlaceholder('Elige Habilidad').addOptions(skillTypes)
            );

            await iRareza.update({ content: `✅ Rareza: **${cartaTemp.rarity}**.\n⚡ **Paso 4:** Configura la habilidad única.`, components: [rowSkill] });

            const iSkill = await msgRareza.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect });
            const sType = iSkill.values[0];
            const skillConfig = { type: sType };

            // PASO 5: DETALLE HABILIDAD + IMAGEN
            const modalSkill = new ModalBuilder().setCustomId('w_modal_skill').setTitle('Detalle Final');
            modalSkill.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sn').setLabel('Nombre de Habilidad').setStyle(TextInputStyle.Short).setRequired(true)));
            modalSkill.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('img').setLabel('URL Imagen Carta').setStyle(TextInputStyle.Short).setRequired(true)));

            if (sType === 'dmg') modalSkill.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Multiplicador (ej: 1.5)').setStyle(TextInputStyle.Short).setRequired(true)));
            if (sType === 'immunity') modalSkill.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Subtipo bloqueado').setStyle(TextInputStyle.Short).setRequired(true)));
            if (sType === 'heal') modalSkill.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Cantidad Curación').setStyle(TextInputStyle.Short).setRequired(true)));

            await iSkill.showModal(modalSkill);
            const iModalSkill = await iSkill.awaitModalSubmit({ time: 60000, filter });

            skillConfig.name = iModalSkill.fields.getTextInputValue('sn');
            cartaTemp.image = iModalSkill.fields.getTextInputValue('img');

            if (sType !== 'agility') {
                const val = iModalSkill.fields.getTextInputValue('val');
                if (sType === 'dmg') skillConfig.power = parseFloat(val);
                if (sType === 'heal') skillConfig.power = parseInt(val);
                if (sType === 'immunity') skillConfig.targetSubtype = val;
            }

            cartaTemp.skills.push(skillConfig);
            cartaTemp.emoji = '🃏';

            const created = db.createCustomCard(guildId, cartaTemp);
            const embed = new EmbedBuilder()
                .setTitle('¡Carta Creada!')
                .setDescription(`**${created.name}**\nTipo: ${created.type}\nSubtipo: ${created.subtype}\nRareza: ${created.rarity}\nSet: ${created.set}\nHP: ${created.stats.hp} | ATK: ${created.stats.atk}\nHabilidad: ${skillConfig.name}`)
                .setImage(created.image)
                .setColor('#00FF00');

            await iModalSkill.reply({ embeds: [embed] });

        } catch (e) {
            console.error(e);
            await interaction.followUp({ content: '⏳ Tiempo agotado o error en el proceso.', ephemeral: true });
        }
    }
  }
};