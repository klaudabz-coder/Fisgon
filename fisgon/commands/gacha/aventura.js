const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAllCards } = require('../../utils/cardRegistry'); 
const { configRareza } = require('../../utils/gachaItems');

const TIEMPO_TURNO = 120000; 
const RECOMPENSA_BASE = 50; 
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-aventura')
    .setDescription('Lucha en modo aventura para cargar tu Atrapasueños')
    .addStringOption(o => o.setName('dificultad').setDescription('Nivel del rival').addChoices({ name: 'Normal', value: 'normal' }, { name: 'Difícil', value: 'hard' })),

  async execute(interaction) {
    const dificultad = interaction.options.getString('dificultad') || 'normal';
    const user = interaction.user;
    const inv = db.getInventory(interaction.guild.id, user.id);

    // 1. Obtener TODAS las cartas del sistema (Originales + Custom)
    const allGameCards = getAllCards(interaction.guild.id);

    // 2. Filtrar cuáles tiene el usuario
    const misCartas = [];
    for (const slot of inv) {
        const item = allGameCards.find(c => c.id === slot.item_id);
        if (item) misCartas.push(item);
    }

    if (misCartas.length === 0) {
        return interaction.reply({ content: '❌ No tienes cartas. Usa `/cartas-abrir` para conseguir algunas.', ephemeral: true });
    }

    // --- FASE 1: ELEGIR LUCHADOR ---
    const rowFighter = new ActionRowBuilder().addComponents(createSelectMenu('sel_fighter', misCartas, 'Elige tu LUCHADOR principal'));
    const cargaActual = db.getAdventureCharge(interaction.guild.id, user.id);

    const msg = await interaction.reply({ 
        content: `⚔️ **Modo Aventura** (Carga: ${cargaActual}%)\n🛡️ **Fase 1:** Selecciona quién peleará al frente.`, 
        components: [rowFighter],
        fetchReply: true
    });

    const filter = i => i.user.id === user.id;
    let fighterItem, supportItem;

    try {
        const sel1 = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
        fighterItem = allGameCards.find(c => c.id === sel1.values[0]);
        await sel1.deferUpdate();

        // --- FASE 2: ELEGIR SOPORTE ---
        const rowSupport = new ActionRowBuilder().addComponents(createSelectMenu('sel_support', misCartas, 'Elige tu SOPORTE (Opcional)'));
        await msg.edit({ content: `✅ Luchador: **${fighterItem.name}**\n🔮 **Fase 2:** Elige una carta de apoyo.`, components: [rowSupport] });

        try {
            const sel2 = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
            supportItem = allGameCards.find(c => c.id === sel2.values[0]);
            await sel2.deferUpdate();
        } catch (e) {
            // Si no elige, va sin soporte
        }

        // --- INICIAR ---
        // El rival siempre es una carta que tenga rol 'fighter' (o cualquiera si es híbrida)
        // Filtramos para que el NPC tenga stats de combate
        const npcOptions = allGameCards.filter(c => c.stats && c.stats.hp > 0);
        const npcCard = npcOptions[Math.floor(Math.random() * npcOptions.length)];

        await iniciarCombate(msg, user, fighterItem, supportItem, npcCard, dificultad, interaction, allGameCards);

    } catch (e) {
        // console.error(e); // Descomentar para debug
        await interaction.editReply({ content: 'Tiempo agotado.', components: [] }).catch(()=>{});
    }
  }
};

async function iniciarCombate(message, user, fighterCard, supportCard, npcCard, dificultad, interaction, allCards) {
    const buff = dificultad === 'hard' ? 1.5 : 1.0;

    // --- CONFIGURAR JUGADOR ---
    const player = {
        name: fighterCard.name,
        stats: { ...fighterCard.stats },
        maxHp: fighterCard.stats.hp,
        currentHp: fighterCard.stats.hp,
        // Si la carta no tiene skills definidas, le damos un set básico
        skills: fighterCard.skills ? fighterCard.skills.map(s => ({ ...s, currentCd: 0 })) : [{ name: 'Ataque', type: 'dmg', power: 1, cd: 0, desc: 'Básico' }],
        buffs: { atk: 0, def: 0 },
        shield: 0
    };

    // --- CONFIGURAR SOPORTE & SINERGIA ---
    let synergyMsg = "";
    const support = supportCard ? {
        name: supportCard.name,
        skill: supportCard.assist ? { ...supportCard.assist, currentCd: 0 } : { name: 'Ayuda', type: 'heal', power: 20, cd: 3 }
    } : null;

    // Verificar Sinergia
    if (support && supportCard.synergy && supportCard.synergy.target === fighterCard.id) {
        synergyMsg = `\n⚡ **¡SINERGIA!** ${supportCard.synergy.name}: ${supportCard.synergy.desc}`;
        // Aplicar bonos simples basados en texto (puedes hacerlo más complejo si quieres)
        if (supportCard.synergy.desc.includes('ATK')) player.stats.atk += 30;
        if (supportCard.synergy.desc.includes('HP')) { player.maxHp += 80; player.currentHp += 80; }
    }

    // --- CONFIGURAR NPC ---
    const npc = {
        name: `NPC ${npcCard.name}`,
        stats: { 
            hp: Math.floor(npcCard.stats.hp * buff),
            atk: Math.floor(npcCard.stats.atk * buff),
            def: Math.floor(npcCard.stats.def * buff),
            spd: Math.floor(npcCard.stats.spd * buff)
        },
        maxHp: Math.floor(npcCard.stats.hp * buff),
        currentHp: Math.floor(npcCard.stats.hp * buff),
        skills: npcCard.skills ? npcCard.skills.map(s => ({ ...s, currentCd: 0 })) : [{ name: 'Golpe', type: 'dmg', power: 1, cd: 0 }],
        buffs: { atk: 0, def: 0 },
        shield: 0
    };

    let turno = 1;
    let log = `¡**${player.name}** vs **${npc.name}**!${synergyMsg}`;
    let batallaActiva = true;

    while (batallaActiva) {

        // 1. DIBUJAR INTERFAZ (Limpia)
        const embed = new EmbedBuilder()
            .setTitle(`Combate - Turno ${turno}`)
            .setDescription(log)
            .setColor(dificultad === 'hard' ? '#FF4444' : '#44FF44')
            .addFields(
                { name: `🟢 ${player.name}`, value: `HP: ${player.currentHp}/${player.maxHp} ${player.shield > 0 ? `🛡️${player.shield}` : ''}\nATK: ${player.stats.atk + player.buffs.atk} DEF: ${player.stats.def + player.buffs.def}`, inline: true },
                { name: `🔴 ${npc.name}`, value: `HP: ${npc.currentHp}/${npc.maxHp} ${npc.shield > 0 ? `🛡️${npc.shield}` : ''}`, inline: true }
            );

        // 2. BOTONES CON INFORMACIÓN
        const rowSkills = new ActionRowBuilder();
        const currentAtk = player.stats.atk + player.buffs.atk;

        player.skills.forEach((skill, index) => {
            let labelInfo = "";

            // Cálculo visual de daño/cura para el botón
            if (skill.type === 'dmg' || skill.type === 'pierce' || skill.type === 'magic') {
                const dmgEst = Math.floor(currentAtk * skill.power);
                labelInfo = `⚔️~${dmgEst}`;
            } else if (skill.type === 'heal') {
                labelInfo = `❤️+${skill.power}`;
            } else if (skill.type === 'shield') {
                labelInfo = `🛡️+${skill.power}`;
            } else if (skill.type.startsWith('buff')) {
                labelInfo = `✨Buff`;
            } else if (skill.type.startsWith('debuff')) {
                labelInfo = `❄️Debuff`;
            }

            const cdText = skill.currentCd > 0 ? ` (⏳${skill.currentCd})` : '';
            // Label Final: "Nombre [Info] (CD)"
            const finalLabel = `${skill.name} [${labelInfo}]${cdText}`;

            rowSkills.addComponents(
                new ButtonBuilder()
                    .setCustomId(`skill_${index}`)
                    .setLabel(finalLabel)
                    .setStyle(skill.currentCd > 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(skill.currentCd > 0)
            );
        });

        // Botón Soporte
        if (support) {
            const sSkill = support.skill;
            let labelInfo = "✨";
            if (sSkill.type === 'heal') labelInfo = `❤️+${sSkill.power}`;
            else if (sSkill.type === 'shield') labelInfo = `🛡️+${sSkill.power}`;
            else if (sSkill.type === 'buff_atk') labelInfo = `⚔️Up`;
            else if (sSkill.type === 'reduce_cd') labelInfo = `⬇️CD`;

            const cdText = sSkill.currentCd > 0 ? ` (⏳${sSkill.currentCd})` : '';
            const finalLabel = `${support.name} [${labelInfo}]${cdText}`;

            rowSkills.addComponents(
                new ButtonBuilder()
                    .setCustomId('support_assist')
                    .setLabel(finalLabel)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(sSkill.currentCd > 0)
            );
        }

        await message.edit({ content: '', embeds: [embed], components: [rowSkills] });

        // 3. TURNO JUGADOR
        try {
            const iAction = await message.awaitMessageComponent({ filter: i => i.user.id === user.id, time: TIEMPO_TURNO });

            let actionLog = '';

            if (iAction.customId.startsWith('skill_')) {
                const idx = parseInt(iAction.customId.split('_')[1]);
                actionLog = ejecutarHabilidad(player.skills[idx], player, npc);
                player.skills[idx].currentCd = player.skills[idx].cd + 1;
            } 
            else if (iAction.customId === 'support_assist') {
                actionLog = `🔮 **Apoyo:** ${ejecutarHabilidad(support.skill, player, npc)}`;
                support.skill.currentCd = support.skill.cd + 1;
            }

            await iAction.update({ components: [] }); 

            // Verificar Victoria
            if (npc.currentHp <= 0) {
                batallaActiva = false;
                await finalizarBatalla(message, interaction, user, true, dificultad, actionLog, allCards);
                return;
            }

            // 4. TURNO NPC
            await wait(1500);

            // IA Simple: Elige skill disponible al azar
            const availableSkills = npc.skills.filter(s => s.currentCd === 0);
            const npcSkill = availableSkills.length > 0 
                ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
                : { name: 'Cansado', type: 'wait', desc: 'Recuperando aliento' }; 

            const npcLog = ejecutarHabilidad(npcSkill, npc, player);
            if (npcSkill.cd) npcSkill.currentCd = npcSkill.cd + 1;

            log = `${actionLog}\n${npcLog}`;

            // Verificar Derrota
            if (player.currentHp <= 0) {
                batallaActiva = false;
                await finalizarBatalla(message, interaction, user, false, dificultad, log, allCards);
                return;
            }

            // 5. FIN DE TURNO (Cooldowns)
            reducirCooldowns(player.skills);
            if (support) reducirCooldowns([support.skill]);
            reducirCooldowns(npc.skills);

            turno++;

        } catch (e) {
            console.log(e);
            batallaActiva = false;
            await message.edit({ content: '⏳ Tiempo agotado.', components: [] });
        }
    }
}

// Lógica de efectos
function ejecutarHabilidad(skill, caster, target) {
    let msg = `**${caster.name}** usó *${skill.name}*...`;

    const atk = caster.stats.atk + (caster.buffs?.atk || 0);
    const def = target.stats.def + (target.buffs?.def || 0);

    switch (skill.type) {
        case 'dmg':
            let dmg = Math.floor((atk * skill.power) - (def * 0.3));
            if (dmg < 1) dmg = 1;
            if (target.shield > 0) {
                const absorb = Math.min(target.shield, dmg);
                target.shield -= absorb;
                dmg -= absorb;
                msg += ` (Escudo -${absorb})`;
            }
            if (dmg > 0) { target.currentHp -= dmg; msg += ` ¡${dmg} daño!`; }
            else if (target.shield > 0) msg += ` ¡Bloqueado!`;
            break;

        case 'heal':
            const heal = skill.power;
            caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
            msg += ` +${heal} HP.`;
            break;

        case 'shield':
            caster.shield = (caster.shield || 0) + skill.power;
            msg += ` +${skill.power} Escudo.`;
            break;

        case 'buff_atk':
            caster.buffs.atk += skill.power;
            msg += ` +${skill.power} ATK.`;
            break;

        case 'buff_def':
            caster.buffs.def += skill.power;
            msg += ` +${skill.power} DEF.`;
            break;

        case 'debuff_spd':
            msg += ` ralentizó al rival.`;
            break;

        case 'reduce_cd':
            msg += ` redujo tiempos.`;
            break;

        default:
            msg += ` ...pero no pasó nada.`;
    }
    return msg;
}

function reducirCooldowns(skills) {
    skills.forEach(s => {
        if (s.currentCd > 0) s.currentCd--;
    });
}

async function finalizarBatalla(message, interaction, user, victoria, dificultad, logFinal, allCards) {
    const embed = new EmbedBuilder()
        .setDescription(logFinal)
        .setTimestamp();

    if (victoria) {
        const premio = dificultad === 'hard' ? RECOMPENSA_BASE * 2 : RECOMPENSA_BASE;
        db.addBalance(interaction.guild.id, user.id, premio);

        const cargaBase = dificultad === 'hard' ? 35 : 20;
        const nuevaCarga = db.addAdventureCharge(interaction.guild.id, user.id, cargaBase);
        let extraMsg = '';

        // PREMIO POR LLENAR BARRA
        if (nuevaCarga >= 100) {
            db.setAdventureCharge(interaction.guild.id, user.id, nuevaCarga - 100);

            // Carta premio: Intentar que no sea común
            const poolPremio = allCards.filter(c => c.rarity !== 'Common');
            const carta = poolPremio.length > 0 
                ? poolPremio[Math.floor(Math.random() * poolPremio.length)]
                : allCards[0];

            db.addToInventory(interaction.guild.id, user.id, carta.id, 1);
            extraMsg = `\n✨ **¡ATRAPASUEÑOS AL MÁXIMO!**\nLa energía acumulada invocó a: **${carta.name}**`;
        }

        embed.setTitle('🏆 ¡VICTORIA!')
             .setColor('#00FF00')
             .addFields({ name: 'Recompensas', value: `💰 +${premio} monedas\n🕸️ Carga: ${nuevaCarga}% (+${cargaBase}%)${extraMsg}` });
    } else {
        embed.setTitle('💀 DERROTA')
             .setColor('#FF0000')
             .setFooter({ text: 'No ganas recompensas esta vez.' });
    }

    await message.edit({ embeds: [embed], components: [] });
}

function createSelectMenu(id, chars, placeholder) {
    // Discord max 25 options
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: `HP:${c.stats.hp} ATK:${c.stats.atk}`,
        value: c.id,
        emoji: c.emoji || '🃏'
    }));
    return new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options);
}