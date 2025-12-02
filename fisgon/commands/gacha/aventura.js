const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

// Configuración
const TIEMPO_SELECCION = 60000; 
const TIEMPO_TURNO = 60000;
const RECOMPENSA_BASE = 50; // Monedas por ganar

// Función de espera para dar realismo al turno del NPC
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura')
    .setDescription('Lucha contra un NPC salvaje para ganar recompensas')
    .addStringOption(o => o.setName('dificultad').setDescription('Nivel del rival').addChoices(
        { name: 'Normal', value: 'normal' },
        { name: 'Difícil (Más recompensas)', value: 'hard' }
    )),

  async execute(interaction) {
    const dificultad = interaction.options.getString('dificultad') || 'normal';
    const user = interaction.user;

    // 1. Obtener inventario
    const inv = db.getInventory(interaction.guild.id, user.id);
    const misCartas = getFightersFromInv(inv);

    if (misCartas.length === 0) {
        return interaction.reply({ content: 'No tienes cartas para pelear. Usa `/cartas-abrir` primero.', ephemeral: true });
    }

    // 2. Menú de selección de personaje
    const rowSelect = new ActionRowBuilder().addComponents(createSelectMenu('p1_select', misCartas));

    const msgInicial = await interaction.reply({ 
        content: `⚔️ **Modo Aventura**\nSelecciona tu carta para salir a explorar.`, 
        components: [rowSelect],
        fetchReply: true
    });

    // 3. Generar Enemigo (NPC)
    // En difícil, el enemigo tiene un buff de stats
    const enemigoBase = itemsGacha[Math.floor(Math.random() * itemsGacha.length)];
    const buff = dificultad === 'hard' ? 1.5 : 1.0;

    // Objeto del NPC
    const npc = {
        name: `NPC ${enemigoBase.name}`,
        emoji: enemigoBase.emoji,
        image: enemigoBase.image,
        maxHp: Math.floor(enemigoBase.stats.hp * buff),
        currentHp: Math.floor(enemigoBase.stats.hp * buff),
        stats: {
            atk: Math.floor(enemigoBase.stats.atk * buff),
            def: Math.floor(enemigoBase.stats.def * buff),
            spd: Math.floor(enemigoBase.stats.spd * buff)
        },
        ability: enemigoBase.ability,
        defMod: 0,
        isNpc: true
    };

    // Colector para selección
    const filter = i => i.user.id === user.id && i.customId === 'p1_select';

    try {
        const seleccion = await msgInicial.awaitMessageComponent({ filter, time: TIEMPO_SELECCION, componentType: ComponentType.StringSelect });

        const charId = seleccion.values[0];
        const baseChar = itemsGacha.find(c => c.id === charId);

        // Objeto del JUGADOR
        const jugador = {
            ...baseChar,
            maxHp: baseChar.stats.hp,
            currentHp: baseChar.stats.hp,
            defMod: 0,
            user: user
        };

        await seleccion.update({ content: `Has elegido a **${jugador.name}**. ¡Un **${npc.name}** salvaje apareció!`, components: [] });

        // INICIAR COMBATE
        await iniciarBatallaPvE(msgInicial, jugador, npc, dificultad, interaction);

    } catch (e) {
        // Si no selecciona nada a tiempo
        await interaction.editReply({ content: '⏳ Te tardaste mucho en prepararte. El enemigo huyó.', components: [] }).catch(()=>{});
    }
  }
};

// --- LÓGICA DE BATALLA PvE ---
async function iniciarBatallaPvE(message, player, npc, dificultad, interaction) {
    let turno = 1;
    let logBatalla = '¡El combate ha comenzado!';
    let finalizado = false;

    // Función para dibujar la interfaz
    const getEmbed = () => {
        const hpPctPlayer = Math.max(0, Math.floor((player.currentHp / player.maxHp) * 10));
        const hpPctNpc = Math.max(0, Math.floor((npc.currentHp / npc.maxHp) * 10));

        const barPlayer = '🟩'.repeat(hpPctPlayer) + '⬛'.repeat(10 - hpPctPlayer);
        const barNpc = '🟥'.repeat(hpPctNpc) + '⬛'.repeat(10 - hpPctNpc);

        return new EmbedBuilder()
            .setTitle(`⚔️ Aventura: ${player.name} vs ${npc.name}`)
            .setDescription(logBatalla)
            .addFields(
                { 
                    name: `${player.emoji} Tú (${player.currentHp}/${player.maxHp})`, 
                    value: `\`${barPlayer}\`\nATK: ${player.stats.atk} | DEF: ${player.stats.def}`, 
                    inline: true 
                },
                { 
                    name: `💀 Rival (${npc.currentHp}/${npc.maxHp})`, 
                    value: `\`${barNpc}\`\nATK: ${npc.stats.atk} | DEF: ${npc.stats.def}`, 
                    inline: true 
                }
            )
            .setColor(dificultad === 'hard' ? '#ff0000' : '#0099ff')
            .setFooter({ text: `Turno ${turno} • Dificultad: ${dificultad.toUpperCase()}` });
    };

    // Botones
    const getRow = (disabled = false) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('atq').setLabel('Atacar').setStyle(ButtonStyle.Primary).setEmoji('🗡️').setDisabled(disabled),
        new ButtonBuilder().setCustomId('hab').setLabel('Habilidad').setStyle(ButtonStyle.Secondary).setEmoji('✨').setDisabled(disabled),
        new ButtonBuilder().setCustomId('huir').setLabel('Huir').setStyle(ButtonStyle.Danger).setEmoji('🏃').setDisabled(disabled)
    );

    // Enviar panel de batalla
    await message.edit({ embeds: [getEmbed()], components: [getRow()] });

    // Bucle principal
    while (!finalizado) {
        // --- TURNO DEL JUGADOR ---
        try {
            const filter = i => i.user.id === player.user.id;
            const iPlayer = await message.awaitMessageComponent({ filter, time: TIEMPO_TURNO, componentType: ComponentType.Button });

            // Reset defensa temporal del jugador al iniciar su turno
            player.defMod = 0; 

            let accionMsg = '';
            let dmg = 0;

            if (iPlayer.customId === 'huir') {
                await iPlayer.update({ content: '🏃 Escapaste del combate a salvo.', embeds: [], components: [] });
                return;
            }

            if (iPlayer.customId === 'atq') {
                const defensaTotal = npc.stats.def + npc.defMod;
                const baseDmg = Math.max(1, player.stats.atk - (defensaTotal * 0.4));
                dmg = Math.floor(baseDmg * (0.9 + Math.random() * 0.2));
                npc.currentHp -= dmg;
                accionMsg = `🗡️ Atacaste a **${npc.name}** causando **${dmg}** daño.`;
            } 
            else if (iPlayer.customId === 'hab') {
                const resultado = usarHabilidad(player, npc);
                npc.currentHp -= resultado.dmg;
                accionMsg = `✨ ${resultado.msg}`;
            }

            // Verificar si el NPC murió
            if (npc.currentHp <= 0) {
                npc.currentHp = 0;
                finalizado = true;

                // Dar recompensas
                const premio = dificultad === 'hard' ? RECOMPENSA_BASE * 2 : RECOMPENSA_BASE;
                const bonus = Math.floor(Math.random() * 20);
                const totalGanado = premio + bonus;

                db.addBalance(interaction.guild.id, player.user.id, totalGanado);

                // Update final
                const embedWin = getEmbed().setColor('#57f287').setTitle('🏆 ¡VICTORIA!');
                embedWin.setDescription(`${accionMsg}\n\n**¡Has derrotado al NPC!**\nGanaste 💰 **${totalGanado}** monedas.`);
                await iPlayer.update({ embeds: [embedWin], components: [] });
                return;
            }

            // Actualizar interfaz antes del turno del NPC
            logBatalla = `${accionMsg}\n*El ${npc.name} está pensando...*`;
            await iPlayer.update({ embeds: [getEmbed()], components: [getRow(true)] }); // Deshabilitar botones

            // --- TURNO DEL NPC (IA) ---
            await wait(1500); // Pequeña pausa dramática

            npc.defMod = 0; // Reset defensa temporal NPC
            let dmgNpc = 0;
            let npcMsg = '';

            // IA Simple: 30% chance de usar habilidad, 70% ataque normal
            const roll = Math.random();

            if (roll < 0.3) {
                const res = usarHabilidad(npc, player); // NPC usa habilidad contra player
                player.currentHp -= res.dmg;
                npcMsg = `🔥 **${npc.name}** usó su habilidad: ${res.msg}`;
            } else {
                const defensaTotalPlayer = player.stats.def + player.defMod;
                const baseDmgNpc = Math.max(1, npc.stats.atk - (defensaTotalPlayer * 0.4));
                dmgNpc = Math.floor(baseDmgNpc * (0.9 + Math.random() * 0.2));
                player.currentHp -= dmgNpc;
                npcMsg = `💢 **${npc.name}** atacó y te hizo **${dmgNpc}** daño.`;
            }

            logBatalla = `${accionMsg}\n${npcMsg}`; // Mostrar lo que pasó en ambos turnos

            // Verificar si el Jugador murió
            if (player.currentHp <= 0) {
                player.currentHp = 0;
                finalizado = true;
                const embedLose = getEmbed().setColor('#ed4245').setTitle('💀 DERROTA');
                embedLose.setDescription(`${npcMsg}\n\n**Has sido derrotado...**\nMejor suerte la próxima vez.`);
                await message.edit({ embeds: [embedLose], components: [] });
                return;
            }

            // Fin del turno, reactivar botones
            turno++;
            await message.edit({ embeds: [getEmbed()], components: [getRow(false)] });

        } catch (e) {
            console.log(e);
            finalizado = true;
            await message.edit({ content: '⏱️ Se acabó el tiempo. Huiste.', components: [] });
        }
    }
}

// Lógica compartida de habilidades
function usarHabilidad(caster, target) {
    const ab = caster.ability;
    let dmg = 0;
    let msg = '';

    if (ab.type === 'heal') {
        const heal = Math.floor(caster.maxHp * 0.35);
        caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
        msg = `se curó **${heal}** HP.`;
    } 
    else if (ab.type === 'buff_def') {
        caster.defMod = 30; // Defensa extra fuerte
        msg = `se protegió (Defensa aumentada este turno).`;
    }
    else if (ab.type === 'pierce' || ab.type === 'magic') {
        dmg = Math.floor(caster.stats.atk * 1.6);
        msg = `lanzó *${ab.name}* e hizo **${dmg}** daño perforante.`;
    }
    else { // Crit / Dmg normal
        dmg = Math.floor(caster.stats.atk * 2.2);
        msg = `asestó un GOLPE CRÍTICO de **${dmg}** daño con *${ab.name}*.`;
    }
    return { dmg, msg };
}

function getFightersFromInv(inventory) {
    const validos = [];
    if (!inventory) return validos;
    for (const slot of inventory) {
        const item = itemsGacha.find(i => i.id === slot.item_id);
        if (item) validos.push(item);
    }
    return validos;
}

function createSelectMenu(id, chars) {
    // Máximo 25 opciones
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: `HP:${c.stats.hp} ATK:${c.stats.atk} - ${c.ability.name}`,
        value: c.id,
        emoji: c.emoji
    }));

    return new StringSelectMenuBuilder()
        .setCustomId(id)
        .setPlaceholder('Elige a tu luchador')
        .addOptions(options);
}