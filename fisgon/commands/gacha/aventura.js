const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

// Configuración
const TIEMPO_SELECCION = 60000; 
const TIEMPO_TURNO = 60000;
const RECOMPENSA_BASE = 50; 

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-aventura')
    .setDescription('Lucha contra NPCs para cargar tu Atrapasueños y conseguir cartas')
    .addStringOption(o => o.setName('dificultad').setDescription('Nivel del rival').addChoices(
        { name: 'Normal', value: 'normal' },
        { name: 'Difícil (Más carga y monedas)', value: 'hard' }
    )),

  async execute(interaction) {
    const dificultad = interaction.options.getString('dificultad') || 'normal';
    const user = interaction.user;

    const inv = db.getInventory(interaction.guild.id, user.id);
    const misCartas = getFightersFromInv(inv);

    if (misCartas.length === 0) {
        return interaction.reply({ content: 'No tienes cartas para pelear. Usa `/cartas-abrir` primero.', ephemeral: true });
    }

    const rowSelect = new ActionRowBuilder().addComponents(createSelectMenu('p1_select', misCartas));

    // Mostramos la carga actual en el mensaje inicial
    const cargaActual = db.getAdventureCharge(interaction.guild.id, user.id);

    const msgInicial = await interaction.reply({ 
        content: `⚔️ **Modo Aventura**\n🕸️ **Atrapasueños:** ${cargaActual}%\nSelecciona tu carta para salir a explorar.`, 
        components: [rowSelect],
        fetchReply: true
    });

    const enemigoBase = itemsGacha[Math.floor(Math.random() * itemsGacha.length)];
    const buff = dificultad === 'hard' ? 1.5 : 1.0;

    const npc = {
        id: enemigoBase.id,
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

    const filter = i => i.user.id === user.id && i.customId === 'p1_select';

    try {
        const seleccion = await msgInicial.awaitMessageComponent({ filter, time: TIEMPO_SELECCION, componentType: ComponentType.StringSelect });
        const charId = seleccion.values[0];
        const baseChar = itemsGacha.find(c => c.id === charId);

        const jugador = {
            ...baseChar,
            maxHp: baseChar.stats.hp,
            currentHp: baseChar.stats.hp,
            defMod: 0,
            user: user
        };

        await seleccion.update({ content: `Has elegido a **${jugador.name}**. ¡Un **${npc.name}** salvaje apareció!`, components: [] });
        await iniciarBatallaPvE(msgInicial, jugador, npc, dificultad, interaction);

    } catch (e) {
        // console.error(e);
        await interaction.editReply({ content: '⏳ Te tardaste mucho en prepararte. El enemigo huyó.', components: [] }).catch(()=>{});
    }
  }
};

async function iniciarBatallaPvE(message, player, npc, dificultad, interaction) {
    let turno = 1;
    let logBatalla = '¡El combate ha comenzado!';
    let finalizado = false;

    const getEmbed = () => {
        const hpPctPlayer = Math.max(0, Math.floor((player.currentHp / player.maxHp) * 10));
        const hpPctNpc = Math.max(0, Math.floor((npc.currentHp / npc.maxHp) * 10));

        const barPlayer = '🟩'.repeat(hpPctPlayer) + '⬛'.repeat(10 - hpPctPlayer);
        const barNpc = '🟥'.repeat(hpPctNpc) + '⬛'.repeat(10 - hpPctNpc);

        return new EmbedBuilder()
            .setTitle(`⚔️ Aventura: ${player.name} vs ${npc.name}`)
            .setDescription(logBatalla)
            .addFields(
                { name: `${player.emoji} Tú (${player.currentHp}/${player.maxHp})`, value: `\`${barPlayer}\``, inline: true },
                { name: `💀 Rival (${npc.currentHp}/${npc.maxHp})`, value: `\`${barNpc}\``, inline: true }
            )
            .setColor(dificultad === 'hard' ? '#ff0000' : '#0099ff')
            .setFooter({ text: `Turno ${turno}` });
    };

    const getRow = (disabled = false) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('atq').setLabel('Atacar').setStyle(ButtonStyle.Primary).setEmoji('🗡️').setDisabled(disabled),
        new ButtonBuilder().setCustomId('hab').setLabel('Habilidad').setStyle(ButtonStyle.Secondary).setEmoji('✨').setDisabled(disabled),
        new ButtonBuilder().setCustomId('huir').setLabel('Huir').setStyle(ButtonStyle.Danger).setEmoji('🏃').setDisabled(disabled)
    );

    await message.edit({ embeds: [getEmbed()], components: [getRow()] });

    while (!finalizado) {
        try {
            const filter = i => i.user.id === player.user.id;
            const iPlayer = await message.awaitMessageComponent({ filter, time: TIEMPO_TURNO, componentType: ComponentType.Button });

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
                accionMsg = `🗡️ Atacaste causando **${dmg}** daño.`;
            } 
            else if (iPlayer.customId === 'hab') {
                const res = usarHabilidad(player, npc);
                npc.currentHp -= res.dmg;
                accionMsg = `✨ ${res.msg}`;
            }

            // --- VICTORIA DEL JUGADOR ---
            if (npc.currentHp <= 0) {
                finalizado = true;

                // 1. Calcular Monedas
                const monedasGanadas = (dificultad === 'hard' ? RECOMPENSA_BASE * 2 : RECOMPENSA_BASE) + Math.floor(Math.random() * 20);
                db.addBalance(interaction.guild.id, player.user.id, monedasGanadas);

                // 2. Calcular Carga de Atrapasueños
                const cargaGanada = dificultad === 'hard' ? 35 : 20;
                let nuevaCarga = db.addAdventureCharge(interaction.guild.id, player.user.id, cargaGanada);

                let msgPremio = `💰 Monedas: **+${monedasGanadas}**\n🕸️ Atrapasueños: **+${cargaGanada}%** (${nuevaCarga}%)`;

                // 3. Verificar si se llenó (100%)
                if (nuevaCarga >= 100) {
                    // Resetear carga (restando 100 para guardar el sobrante)
                    nuevaCarga -= 100;
                    db.setAdventureCharge(interaction.guild.id, player.user.id, nuevaCarga);

                    // Generar Carta Gratis
                    const rand = Math.random() * 100;
                    let rareza = 'Common';
                    if (rand <= configRareza.Legendary.chance) rareza = 'Legendary';
                    else if (rand <= configRareza.Epic.chance) rareza = 'Epic';
                    else if (rand <= configRareza.Rare.chance) rareza = 'Rare';

                    const pool = itemsGacha.filter(item => item.rarity === rareza);
                    const cartaGanada = pool[Math.floor(Math.random() * pool.length)];

                    db.addToInventory(interaction.guild.id, player.user.id, cartaGanada.id, 1);

                    msgPremio += `\n\n✨ **¡ATRAPASUEÑOS AL MÁXIMO!** ✨\nLa energía acumulada se materializó en:\n🃏 **${cartaGanada.name}** (${configRareza[rareza].label})`;
                }

                const embedWin = getEmbed().setColor('#57f287').setTitle('🏆 ¡VICTORIA!');
                embedWin.setDescription(`${accionMsg}\n\n**¡Has derrotado al NPC!**\n${msgPremio}`);
                await iPlayer.update({ embeds: [embedWin], components: [] });
                return;
            }

            // Turno del NPC
            logBatalla = `${accionMsg}\n*El ${npc.name} está furioso...*`;
            await iPlayer.update({ embeds: [getEmbed()], components: [getRow(true)] });

            await wait(1500); 

            npc.defMod = 0;
            let dmgNpc = 0;
            let npcMsg = '';
            const rollNpc = Math.random();

            if (rollNpc < 0.3) {
                const res = usarHabilidad(npc, player);
                player.currentHp -= res.dmg;
                npcMsg = `🔥 **${npc.name}** usó habilidad: ${res.msg}`;
            } else {
                const defensaTotalPlayer = player.stats.def + player.defMod;
                const baseDmgNpc = Math.max(1, npc.stats.atk - (defensaTotalPlayer * 0.4));
                dmgNpc = Math.floor(baseDmgNpc * (0.9 + Math.random() * 0.2));
                player.currentHp -= dmgNpc;
                npcMsg = `💢 **${npc.name}** atacó y te hizo **${dmgNpc}** daño.`;
            }

            logBatalla = `${accionMsg}\n${npcMsg}`;

            // Derrota del Jugador
            if (player.currentHp <= 0) {
                finalizado = true;
                const embedLose = getEmbed().setColor('#ed4245').setTitle('💀 DERROTA');
                embedLose.setDescription(`${npcMsg}\n\n**Te has quedado sin vida...**\nNo ganas carga ni monedas.`);
                await message.edit({ embeds: [embedLose], components: [] });
                return;
            }

            turno++;
            await message.edit({ embeds: [getEmbed()], components: [getRow(false)] });

        } catch (e) {
            finalizado = true;
            await message.edit({ content: '⏱️ Combate finalizado por inactividad.', components: [] });
        }
    }
}

function usarHabilidad(caster, target) {
    const ab = caster.ability;
    let dmg = 0;
    let msg = '';
    if (ab.type === 'heal') {
        const heal = Math.floor(caster.maxHp * 0.35);
        caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
        msg = `se curó **${heal}** HP.`;
    } else if (ab.type === 'buff_def') {
        caster.defMod = 30;
        msg = `se protegió.`;
    } else if (ab.type === 'pierce' || ab.type === 'magic') {
        dmg = Math.floor(caster.stats.atk * 1.6);
        msg = `lanzó *${ab.name}* e hizo **${dmg}** daño perforante.`;
    } else {
        dmg = Math.floor(caster.stats.atk * 2.2);
        msg = `asestó un GOLPE CRÍTICO de **${dmg}** daño.`;
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
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: `HP:${c.stats.hp} ATK:${c.stats.atk}`,
        value: c.id,
        emoji: c.emoji
    }));
    return new StringSelectMenuBuilder().setCustomId(id).setPlaceholder('Elige tu carta').addOptions(options);
}