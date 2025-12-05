const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAllCards } = require('../../utils/cardRegistry');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('batalla')
    .setDescription('Sistema de combate TCG')
    .addSubcommand(sub => sub.setName('npc').setDescription('Luchar contra La Pesadilla (Gana sobres gratis)'))
    .addSubcommand(sub => sub.setName('jugador').setDescription('Luchar contra otro usuario').addUserOption(u => u.setName('rival').setDescription('Rival').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const p1User = interaction.user;
    const allCards = getAllCards(interaction.guild.id);
    const guildId = interaction.guild.id;

    // Helpers
    const getDeckFromInventory = (uid) => {
        const inv = db.getInventory(guildId, uid);
        return inv.map(slot => allCards.find(c => c.id === slot.item_id)).filter(c => c);
    };

    // 1. VERIFICAR INVENTARIO BÁSICO
    const fullInvP1 = getDeckFromInventory(p1User.id);
    if (fullInvP1.length < 1) return interaction.reply({ content: '❌ No tienes cartas.', ephemeral: true });

    // 2. CONFIGURAR RIVAL (P2)
    let p2User, p2IsNpc = false;
    if (sub === 'npc') {
        p2IsNpc = true;
        p2User = { id: 'npc', username: '🤖 La Pesadilla', bot: true };
    } else {
        p2User = interaction.options.getUser('rival');
        if (p2User.bot || p2User.id === p1User.id) return interaction.reply({ content: '❌ Rival inválido.', ephemeral: true });
        const invP2 = getDeckFromInventory(p2User.id);
        if (invP2.length < 1) return interaction.reply({ content: `❌ ${p2User.username} no tiene cartas.`, ephemeral: true });
    }

    // --- SELECCIÓN DE EQUIPO P1 (NUEVO: MANUAL O BARAJA) ---
    const equipoP1 = await prepararEquipo(interaction, p1User, fullInvP1, guildId);
    if (!equipoP1) return; // Cancelado o error

    // --- SELECCIÓN DE EQUIPO P2 ---
    let equipoP2;
    if (p2IsNpc) {
        // Generar equipo NPC random
        const enemies = allCards.filter(c => c.stats && c.stats.hp > 0);
        const cardsNpc = Array(4).fill(0).map(() => enemies[Math.floor(Math.random() * enemies.length)]);
        equipoP2 = buildTeamObj(p2User, cardsNpc, true);
    } else {
        interaction.followUp({ content: `⚠️ **${p2User.username}**, se te ha asignado tu mejor equipo automáticamente (WIP: Multijugador turno por turno real pendiente).`, ephemeral: true });
        // Simplemente cogemos las primeras 4 cartas del rival por ahora
        const invP2 = getDeckFromInventory(p2User.id);
        const cardsP2 = invP2.slice(0, 4);
        equipoP2 = buildTeamObj(p2User, cardsP2, false);
    }

    // INICIAR BUCLE
    await loopBatalla(interaction, equipoP1, equipoP2);
  }
};

// --- FUNCIONES AUXILIARES NUEVAS ---

function buildTeamObj(user, cardList, isNPC) {
    // La primera carta es la activa, el resto banca
    const active = initCard(cardList[0]);
    const bench = cardList.slice(1).map(initCard);
    return { user, active, bench, isNPC };
}

function initCard(c) {
    if (!c) return null;
    return {
        ...c,
        maxHp: c.stats.hp,
        currentHp: c.stats.hp,
        skill: (c.skills && c.skills[0]) ? c.skills[0] : { name: 'Ataque', type: 'dmg', power: 1 }
    };
}

// Lógica para elegir baraja o manual
async function prepararEquipo(interaction, user, inventoryCards, guildId) {
    // Buscar barajas guardadas
    const decks = db.getDecks(guildId, user.id);

    // Si no hay barajas, vamos directo a manual
    if (decks.length === 0) {
        return await selectorManual(interaction, user, inventoryCards);
    }

    // Si hay barajas, preguntamos
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('deck_select_battle')
            .setPlaceholder('Elige una Baraja guardada o Manual')
            .addOptions(
                ...decks.map(d => ({ 
                    label: `Baraja #${d.slot}`, 
                    description: `${d.cards.length} cartas`, 
                    value: `deck_${d.slot}`, 
                    emoji: '💾' 
                })),
                { label: 'Selección Manual', description: 'Elegir cartas una a una', value: 'manual', emoji: '🖐️' }
            )
    );

    const msg = await interaction.reply({ content: `⚔️ **Prepárate para la batalla**\nSelecciona una baraja guardada o arma tu equipo manual.`, components: [row], fetchReply: true, ephemeral: true });

    try {
        const i = await msg.awaitMessageComponent({ filter: x => x.user.id === user.id, time: 30000 });
        const val = i.values[0];

        if (val === 'manual') {
            await i.update({ content: 'Pasando a selección manual...', components: [] });
            return await selectorManual(interaction, user, inventoryCards, true); // true = es followup
        } else {
            // Cargar baraja
            const slot = parseInt(val.split('_')[1]);
            const deck = decks.find(d => d.slot === slot);

            // Validar propiedad de cartas (por si vendió alguna)
            const validCards = [];
            // Hacemos una copia del inventario para ir "tachando" cartas usadas y validar cantidades
            // (Simplificado: verificamos que exista el ID en el inventario global)
            const inventoryIds = inventoryCards.map(c => c.id);

            for (const id of deck.cards) {
                if (inventoryIds.includes(id)) {
                    // Buscamos el objeto carta completo
                    const cardObj = inventoryCards.find(c => c.id === id);
                    validCards.push(cardObj);
                }
            }

            if (validCards.length < 1) {
                await i.update({ content: '❌ Tu baraja contiene cartas que ya no tienes. Usa selección manual.', components: [] });
                return null;
            }

            await i.update({ content: `✅ Cargada **Baraja #${slot}**. ¡A luchar!`, components: [] });
            return buildTeamObj(user, validCards, false);
        }

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: '⏳ Tiempo agotado.', components: [] }).catch(()=>{});
        return null;
    }
}

// El selector antiguo (ligeramente adaptado)
async function selectorManual(interaction, user, mazo, isFollowUp = false) {
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('sel_active').setPlaceholder('Elige tu ATACANTE (Frente)')
            .addOptions(mazo.slice(0, 25).map(c => ({ label: c.name, description: `HP: ${c.stats.hp}`, value: c.id })))
    );

    let msg;
    const txt = `🛡️ **${user.username}**, arma tu estrategia manual.`;

    if (isFollowUp) {
        msg = await interaction.followUp({ content: txt, components: [row], ephemeral: true, fetchReply: true });
    } else {
        msg = await interaction.reply({ content: txt, components: [row], ephemeral: true, fetchReply: true });
    }

    try {
        const i = await msg.awaitMessageComponent({ time: 60000 });
        const activeId = i.values[0];
        const active = mazo.find(c => c.id === activeId);

        // Filtrar para no repetir la misma carta (si solo tiene 1 copia) en banca
        // Simplificado: Excluir por referencia de objeto o ID
        const resto = mazo.filter(c => c.id !== activeId);

        let bench = [];
        if (resto.length > 0) {
            const rowBench = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('sel_bench').setPlaceholder('Elige hasta 3 APOYOS (Atrás)')
                    .setMinValues(0).setMaxValues(Math.min(3, resto.length))
                    .addOptions(resto.slice(0, 25).map(c => ({ label: c.name, value: c.id })))
            );
            await i.update({ content: `✅ Atacante: **${active.name}**. Elige Apoyos:`, components: [rowBench] });
            const i2 = await msg.awaitMessageComponent({ time: 60000 });
            bench = i2.values.map(id => resto.find(c => c.id === id));
            await i2.deferUpdate();
        } else {
            await i.deferUpdate();
        }

        return buildTeamObj(user, [active, ...bench], false);
    } catch (e) {
        return null;
    }
}

// --- LOGICA DE BATALLA (Idéntica a la anterior, solo copiada para mantener funcionalidad completa) ---
async function loopBatalla(interaction, p1, p2) {
    let activeP = p1;
    let opponent = p2;
    let log = "¡Inicio del combate!";
    let battleOn = true;

    const channel = interaction.channel;
    // Enviamos mensaje público
    const msgUI = await channel.send('Iniciando campo de batalla...');

    while (battleOn) {
        if (!activeP.active && activeP.bench.length === 0) { battleOn = false; break; }

        // Render UI
        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${p1.user.username} vs ${p2.user.username}`)
            .setColor(activeP === p1 ? '#5865F2' : '#F25858')
            .setDescription(`
                📢 **Turno de ${activeP.user.username}**

                🔵 **${p1.active.name}** [${p1.active.currentHp}/${p1.active.maxHp} HP]
                Skill: ${p1.active.skill.name} | Sub: ${p1.active.subtype || 'N/A'}
                *Apoyos:* ${p1.bench.length}

                🔴 **${p2.active.name}** [${p2.active.currentHp}/${p2.active.maxHp} HP]
                Skill: ${p2.active.skill.name} | Sub: ${p2.active.subtype || 'N/A'}
                *Apoyos:* ${p2.bench.length}

                📜 **Log:** ${log}
            `)
            .setImage(activeP.active.image || null);

        const components = [];
        if (!activeP.isNPC) {
            const btnAtk = new ButtonBuilder().setCustomId('atk').setLabel('⚔️ Usar Habilidad').setStyle(ButtonStyle.Danger);
            const menuSwap = activeP.bench.length > 0 ? new StringSelectMenuBuilder()
                .setCustomId('swap')
                .setPlaceholder('🔄 Cambiar Atacante')
                .addOptions(activeP.bench.map((c, i) => ({ label: c.name, description: `HP: ${c.currentHp}`, value: i.toString() }))) 
                : null;

            components.push(new ActionRowBuilder().addComponents(btnAtk));
            if (menuSwap) components.push(new ActionRowBuilder().addComponents(menuSwap));
        }

        await msgUI.edit({ embeds: [embed], components });

        // Turn Logic
        let turnEnded = true;

        if (activeP.isNPC) {
            await new Promise(r => setTimeout(r, 2000));
            await resolverAccion('atk', activeP, opponent);
        } else {
            try {
                // Solo el jugador activo puede tocar botones
                const i = await msgUI.awaitMessageComponent({ filter: x => x.user.id === activeP.user.id, time: 60000 });
                if (i.customId === 'atk') {
                    await i.deferUpdate();
                    await resolverAccion('atk', activeP, opponent);
                } else if (i.customId === 'swap') {
                    const idx = parseInt(i.values[0]);
                    const entra = activeP.bench[idx];
                    const sale = activeP.active;

                    activeP.active = entra;
                    activeP.bench[idx] = sale;
                    log = `🔄 **${activeP.user.username}** cambia a ${entra.name}.`;

                    if (sale.skill.type === 'agility') {
                        log += " (Agilidad: No pierde turno)";
                        turnEnded = false;
                    }
                    await i.deferUpdate();
                }
            } catch (e) {
                log = "⌛ Tiempo agotado. Cambio de turno.";
            }
        }

        // Check Muerte
        if (opponent.active.currentHp <= 0) {
            log += `\n💀 **${opponent.active.name}** derrotado.`;
            if (opponent.bench.length === 0) {
                finalizar(interaction, msgUI, activeP, opponent);
                return;
            }
            await forzarCambio(interaction, opponent);
        }

        if (turnEnded) {
            [activeP, opponent] = [opponent, activeP];
        }
    }

    async function resolverAccion(type, atkP, defP) {
        const skill = atkP.active.skill;
        let dmg = 0;

        if (skill.type === 'heal') {
            const cur = skill.power || 30;
            atkP.active.currentHp = Math.min(atkP.active.maxHp, atkP.active.currentHp + cur);
            log = `✨ **${atkP.active.name}** se cura ${cur} HP.`;
            return;
        } 

        let mult = skill.type === 'dmg' ? (skill.power || 1) : 1;
        dmg = Math.floor(atkP.active.stats.atk * mult);

        const defSkill = defP.active.skill;
        if (defSkill.type === 'immunity' && defSkill.targetSubtype && atkP.active.subtype) {
            if (defSkill.targetSubtype.toLowerCase() === atkP.active.subtype.toLowerCase()) {
                dmg = 0;
                log = `🛡️ **${defP.active.name}** es INMUNE a ${atkP.active.subtype}!`;
                return;
            }
        }

        defP.active.currentHp -= dmg;
        log = `⚔️ **${atkP.active.name}** hace **${dmg}** de daño.`;
    }

    async function forzarCambio(interaction, player) {
        if (player.isNPC) {
            player.active = player.bench.shift();
            log += `\n🤖 La IA saca a **${player.active.name}**.`;
        } else {
            // UI forzada
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('force_swap').setPlaceholder('⚠️ ELIGE TU NUEVO ATACANTE')
                    .addOptions(player.bench.map((c, i) => ({ label: c.name, value: i.toString() })))
            );
            // Mensaje efímero al usuario para no spammear el canal principal
            const msgForce = await interaction.channel.send({ 
                content: `${player.user} ¡Tu carta cayó! Tienes 30s para elegir reemplazo:`, 
                components: [row] 
            });

            try {
                const i = await msgForce.awaitMessageComponent({ filter: x => x.user.id === player.user.id, time: 30000 });
                const idx = parseInt(i.values[0]);
                player.active = player.bench.splice(idx, 1)[0];
                log += `\n🔄 **${player.user.username}** saca a **${player.active.name}**.`;
                await i.update({ content: '✅ Cambio realizado.', components: [] });
                setTimeout(() => msgForce.delete().catch(()=>{}), 2000);
            } catch (e) {
                player.active = player.bench.shift();
                log += `\n⚠️ Auto-cambio por tiempo.`;
                if(msgForce.deletable) msgForce.delete().catch(()=>{});
            }
        }
    }
}

function finalizar(interaction, msg, ganador, perdedor) {
    const embed = new EmbedBuilder()
        .setTitle('🏆 ¡Batalla Finalizada!')
        .setDescription(`**${ganador.user.username}** ha eliminado todas las cartas de **${perdedor.user.username}**.`)
        .setColor('#FFD700');

    if (ganador.isNPC === false && perdedor.isNPC === true) {
        const reward = db.addDreamCharge(interaction.guild.id, ganador.user.id, 25);
        let txt = `\n🕸️ **Atrapasueños:** +25% (Total: ${reward.newCharge}%)`;
        if (reward.packsGained > 0) txt += `\n🎁 **¡Sobre Gratis Conseguido!** (${reward.totalPacks} disponibles)`;
        embed.addFields({ name: 'Recompensas', value: txt });
    }

    msg.edit({ embeds: [embed], components: [] });
}