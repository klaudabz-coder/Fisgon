const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAllCards } = require('../../utils/cardRegistry');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mazo')
    .setDescription('Gestiona tus barajas de combate')
    .addSubcommand(sub => sub.setName('ver').setDescription('Muestra tus barajas guardadas'))
    .addSubcommand(sub => 
        sub.setName('crear')
           .setDescription('Crea o edita una baraja')
           .addIntegerOption(o => o.setName('slot').setDescription('Número de ranura (1-3)').setRequired(true).setMinValue(1).setMaxValue(3))
    )
    .addSubcommand(sub => 
        sub.setName('borrar')
           .setDescription('Borra una baraja')
           .addIntegerOption(o => o.setName('slot').setDescription('Número de ranura (1-3)').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const slot = interaction.options.getInteger('slot');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const allCards = getAllCards(guildId);

    // --- VER BARAJAS ---
    if (sub === 'ver') {
        const decks = db.getDecks(guildId, userId);
        if (decks.length === 0) return interaction.reply({ content: '📭 No tienes barajas guardadas. Usa `/mazo crear`.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(`📂 Barajas de ${interaction.user.username}`)
            .setColor('#60a5fa');

        decks.forEach(d => {
            const nombresCartas = d.cards.map(id => {
                const c = allCards.find(card => card.id === id);
                return c ? c.name : 'Desconocida';
            });
            embed.addFields({ 
                name: `Baraja #${d.slot}`, 
                value: `⚔️ **${nombresCartas[0]}** (Líder)\n🛡️ ${nombresCartas.slice(1).join(', ')}`, 
                inline: false 
            });
        });

        return interaction.reply({ embeds: [embed] });
    }

    // --- BORRAR BARAJA ---
    if (sub === 'borrar') {
        const deleted = db.deleteDeck(guildId, userId, slot);
        if (deleted) return interaction.reply({ content: `🗑️ Baraja del slot **${slot}** eliminada.`, ephemeral: true });
        return interaction.reply({ content: `❌ No existe una baraja en el slot ${slot}.`, ephemeral: true });
    }

    // --- CREAR BARAJA ---
    if (sub === 'crear') {
        // 1. Obtener inventario
        const inventory = db.getInventory(guildId, userId);
        if (!inventory || inventory.length < 4) {
            return interaction.reply({ content: '❌ Necesitas al menos 4 cartas en tu inventario para crear una baraja.', ephemeral: true });
        }

        // 2. Mapear inventario a objetos carta únicos (para el menú)
        // Nota: Solo mostramos las primeras 25 cartas únicas por límites de Discord
        const availableCards = [];
        const seenIds = new Set();

        for (const slotInv of inventory) {
            if (availableCards.length >= 25) break;
            if (!seenIds.has(slotInv.item_id)) {
                const c = allCards.find(x => x.id === slotInv.item_id);
                if (c) {
                    availableCards.push(c);
                    seenIds.add(slotInv.item_id);
                }
            }
        }

        // 3. Crear Menú de Selección
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('deck_builder')
                .setPlaceholder(`Selecciona 4 cartas para el Slot ${slot}`)
                .setMinValues(4) // Obligatorio elegir 4
                .setMaxValues(4)
                .addOptions(availableCards.map(c => ({
                    label: c.name,
                    description: `${c.rarity} - HP: ${c.stats ? c.stats.hp : '?'}`,
                    value: c.id,
                    emoji: c.emoji || '🃏'
                })))
        );

        const msg = await interaction.reply({ 
            content: `🎴 **Creando Baraja #${slot}**\nSelecciona exactamente **4 cartas** del menú.\nLa **primera** carta que selecciones (en orden de la lista interna) o la primera que procese el sistema suele ser aleatoria, pero podrás ordenarlas después en batalla. (Por ahora, se guardan tal cual).`,
            components: [row],
            fetchReply: true,
            ephemeral: true
        });

        // 4. Esperar respuesta
        try {
            const selection = await msg.awaitMessageComponent({ 
                filter: i => i.user.id === interaction.user.id, 
                time: 60000, 
                componentType: ComponentType.StringSelect 
            });

            const selectedIds = selection.values; // Array de 4 IDs

            // Guardar en DB
            db.saveDeck(guildId, userId, slot, selectedIds);

            // Nombres para confirmar
            const names = selectedIds.map(id => availableCards.find(c => c.id === id)?.name).join(', ');

            await selection.update({ 
                content: `✅ **Baraja #${slot} Guardada.**\nCartas: ${names}`, 
                components: [] 
            });

        } catch (e) {
            await interaction.editReply({ content: '⏳ Tiempo agotado.', components: [] }).catch(()=>{});
        }
    }
  }
};