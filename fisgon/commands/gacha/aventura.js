const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

const TIEMPO_TURNO = 120000; 
const RECOMPENSA_BASE = 50; 
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-aventura')
    .setDescription('Lucha en modo aventura con tu equipo')
    .addStringOption(o => o.setName('dificultad').setDescription('Nivel del rival').addChoices({ name: 'Normal', value: 'normal' }, { name: 'Difícil', value: 'hard' })),

  async execute(interaction) {
    const dificultad = interaction.options.getString('dificultad') || 'normal';
    const user = interaction.user;
    const inv = db.getInventory(interaction.guild.id, user.id);

    const fighters = getCardsByRole(inv, 'fighter');
    const supports = getCardsByRole(inv, 'support');

    if (fighters.length === 0) return interaction.reply({ content: '❌ Necesitas al menos una carta de tipo **LUCHADOR**.', ephemeral: true });

    // FASE 1: LUCHADOR
    const rowFighter = new ActionRowBuilder().addComponents(createSelectMenu('sel_fighter', fighters, 'Elige tu LUCHADOR principal'));
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
        fighterItem = itemsGacha.find(c => c.id === sel1.values[0]);
        await sel1.deferUpdate();

        // FASE 2: SOPORTE
        if (supports.length > 0) {
            const rowSupport = new ActionRowBuilder().addComponents(createSelectMenu('sel_support', supports, 'Elige tu SOPORTE (Opcional)'));
            await msg.edit({ content: `✅ Luchador: **${fighterItem.name}**\n🔮 **Fase 2:** Elige una carta de apoyo.`, components: [rowSupport] });

            try {
                const sel2 = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
                supportItem = itemsGacha.find(c => c.id === sel2.values[0]);
                await sel2.deferUpdate();
            } catch (e) { }
        }

        // INICIAR
        const allNpcOptions = itemsGacha.filter(c => c.role === 'fighter');
        const npcCard = allNpcOptions[Math.floor(Math.random() * allNpcOptions.length)];

        await iniciarCombate(msg, user, fighterItem, supportItem, npcCard, dificultad, interaction);

    } catch (e) {
        console.log(e);
        await interaction.editReply({ content: 'Tiempo agotado.', components: [] }).catch(()=>{});
    }
  }
};

async function iniciarCombate(message, user, fighterCard, supportCard, npcCard, dificultad, interaction) {
    const buff = dificultad === 'hard' ? 1.5 : 1.0;

    // JUGADOR
    const player = {
        name: fighterCard.name,
        stats: { ...fighterCard.stats },
        maxHp: fighterCard.stats.hp,
        currentHp: fighterCard.stats.hp,
        skills: fighterCard.skills.map(s => ({ ...s, currentCd: 0 })), 
        buffs: { atk: 0, def: 0 },
        shield: 0
    };

    // SOPORTE
    const support = supportCard ? {
        name: supportCard.name,
        skill: { ...supportCard.assist, currentCd: 0 }
    } : null;

    // NPC
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
        skills: npcCard.skills.map(s => ({ ...s, currentCd: 0 })),
        buffs: { atk: 0, def: 0 },
        shield: 0
    };

    let turno = 1;
    let log = `¡**${player.name}** (con ${support ? support.name : 'nadie'}) se enfrenta a **${npc.name}**!`;
    let batallaActiva = true;

    while (batallaActiva) {

        // --- 1. DIBUJAR INTERFAZ (Sin lista de habilidades) ---
        const embed = new EmbedBuilder()
            .setTitle(`Combate - Turno ${turno}`)
            .setDescription(log) // Solo muestra lo que pasó
            .setColor(dificultad === 'hard' ? '#FF4444' : '#44FF44')
            .addFields(
                { name: `🟢 ${player.name}`, value: `HP: ${player.currentHp}/${player.maxHp} ${player.shield > 0 ? `🛡️${player.shield}` : ''}\nATK: ${player.stats.atk + player.buffs.atk} DEF: ${player.stats.def + player.buffs.def}`, inline: true },
                { name: `🔴 ${npc.name}`, value: `HP: ${npc.currentHp}/${npc.maxHp} ${npc.shield > 0 ? `🛡️${npc.shield}` : ''}`, inline: true }
            );

        // --- 2. BOTONES CON INFO INTEGRADA ---
        const rowSkills = new ActionRowBuilder();

        player.skills.forEach((skill, index) => {
            let labelInfo = "";
            const currentAtk = player.stats.atk + player.buffs.atk;

            // Calcular info visual para el botón
            if (skill.type === 'dmg' || skill.type === 'pierce' || skill.type === 'magic') {
                const dmgEst = Math.floor(currentAtk * skill.power);
                labelInfo = `⚔️ ~${dmgEst}`;
            } else if (skill.type === 'heal') {
                labelInfo = `❤️ +${skill.power}`;
            } else if (skill.type === 'shield') {
                labelInfo = `🛡️ +${skill.power}`;
            } else if (skill.type.startsWith('buff')) {
                labelInfo = `✨ Buff`;
            } else if (skill.type.startsWith('debuff')) {
                labelInfo = `❄️ Debuff`;
            }

            const cdText = skill.currentCd > 0 ? ` (⏳${skill.currentCd})` : '';
            // Formato: "Nombre [Info]"
            const finalLabel = `${skill.name} [${labelInfo}]${cdText}`;

            rowSkills.addComponents(
                new ButtonBuilder()
                    .setCustomId(`skill_${index}`)
                    .setLabel(finalLabel)
                    .setStyle(skill.currentCd > 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(skill.currentCd > 0)
            );
        });

        // Botón de Soporte
        if (support) {
            const sSkill = support.skill;
            let labelInfo = "✨";
            if (sSkill.type === 'heal') labelInfo = `❤️ +${sSkill.power}`;
            else if (sSkill.type === 'shield') labelInfo = `🛡️ +${sSkill.power}`;
            else if (sSkill.type.startsWith('buff')) labelInfo = `✨ Buff`;
            else if (sSkill.type === 'reduce_cd') labelInfo = `⬇️ CD`;

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

        // --- 3. TURNO JUGADOR ---
        try {
            const iAction = await message.awaitMessageComponent({ filter: i => i.user.id === user.id, time: TIEMPO_TURNO });

            let actionLog = '';
            let usedSkill = null;

            if (iAction.customId.startsWith('skill_')) {
                const idx = parseInt(iAction.customId.split('_')[1]);
                usedSkill = player.skills[idx];
                actionLog = ejecutarHabilidad(usedSkill, player, npc);
                player.skills[idx].currentCd = usedSkill.cd + 1;
            } 
            else if (iAction.customId === 'support_assist') {
                usedSkill = support.skill;
                actionLog = `🔮 **Apoyo:** ${ejecutarHabilidad(usedSkill, player, npc)}`;
                support.skill.currentCd = usedSkill.cd + 1;
            }

            await iAction.update({ components: [] }); 

            if (npc.currentHp <= 0) {
                batallaActiva = false;
                await finalizarBatalla(message, interaction, user, true, dificultad, actionLog);
                return;
            }

            // --- 4. TURNO NPC ---
            await wait(1500);

            const availableSkills = npc.skills.filter(s => s.currentCd === 0);
            const npcSkill = availableSkills.length > 0 
                ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
                : { name: 'Cansado', type: 'wait', desc: 'No hace nada' }; 

            const npcLog = ejecutarHabilidad(npcSkill, npc, player);
            if (npcSkill.cd) npcSkill.currentCd = npcSkill.cd + 1;

            log = `${actionLog}\n${npcLog}`;

            if (player.currentHp <= 0) {
                batallaActiva = false;
                await finalizarBatalla(message, interaction, user, false, dificultad, log);
                return;
            }

            // --- 5. FIN DE TURNO ---
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

function ejecutarHabilidad(skill, caster, target) {
    let msg = `**${caster.name}** usó *${skill.name}*...`;

    const atk = caster.stats.atk + (caster.buffs?.atk || 0);
    const def = target.stats.def + (target.buffs?.def || 0);

    switch (skill.type) {
        case 'dmg':
            // Daño = (Atk * Power) - (Def * 0.3)
            let dmg = Math.floor((atk * skill.power) - (def * 0.3));
            if (dmg < 1) dmg = 1;

            if (target.shield > 0) {
                const absorb = Math.min(target.shield, dmg);
                target.shield -= absorb;
                dmg -= absorb;
                msg += ` ¡Escudo absorbió ${absorb}!`;
            }

            if (dmg > 0) {
                target.currentHp -= dmg;
                msg += ` ¡${dmg} daño!`;
            } else if (target.shield > 0) {
                msg += ` ¡Bloqueado!`;
            }
            break;

        case 'heal':
            const heal = skill.power;
            caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
            msg += ` recuperó ${heal} HP.`;
            break;

        case 'shield':
            caster.shield = (caster.shield || 0) + skill.power;
            msg += ` ganó ${skill.power} de Escudo.`;
            break;

        case 'buff_atk':
            caster.buffs.atk += skill.power;
            msg += ` subió su ataque.`;
            break;

        case 'buff_def':
            caster.buffs.def += skill.power;
            msg += ` subió su defensa.`;
            break;

        case 'buff_spd':
            msg += ` aumentó su velocidad.`;
            break;

        case 'debuff_spd':
            msg += ` ralentizó al rival.`;
            break;

        case 'reduce_cd':
            msg += ` redujo tiempos de espera.`;
            break;

        case 'wait':
            msg += ` está recuperando aliento.`;
            break;
    }
    return msg;
}

function reducirCooldowns(skills) {
    skills.forEach(s => {
        if (s.currentCd > 0) s.currentCd--;
    });
}

async function finalizarBatalla(message, interaction, user, victoria, dificultad, logFinal) {
    const embed = new EmbedBuilder()
        .setDescription(logFinal)
        .setTimestamp();

    if (victoria) {
        const premio = dificultad === 'hard' ? RECOMPENSA_BASE * 2 : RECOMPENSA_BASE;
        db.addBalance(interaction.guild.id, user.id, premio);

        const carga = dificultad === 'hard' ? 35 : 20;
        const nuevaCarga = db.addAdventureCharge(interaction.guild.id, user.id, carga);
        let extraMsg = '';

        if (nuevaCarga >= 100) {
            db.setAdventureCharge(interaction.guild.id, user.id, nuevaCarga - 100);
            const carta = itemsGacha.find(c => c.role === 'fighter' && c.rarity !== 'Common') || itemsGacha[0];
            db.addToInventory(interaction.guild.id, user.id, carta.id, 1);
            extraMsg = `\n✨ **¡ATRAPASUEÑOS AL MÁXIMO!** Conseguiste: **${carta.name}**`;
        }

        embed.setTitle('🏆 ¡VICTORIA!')
             .setColor('#00FF00')
             .addFields({ name: 'Recompensas', value: `💰 +${premio} monedas\n🕸️ Carga: ${nuevaCarga}% (+${carga}%)${extraMsg}` });
    } else {
        embed.setTitle('💀 DERROTA')
             .setColor('#FF0000')
             .setFooter({ text: 'No ganas recompensas esta vez.' });
    }

    await message.edit({ embeds: [embed], components: [] });
}

function getCardsByRole(inventory, role) {
    const validos = [];
    if (!inventory) return validos;
    for (const slot of inventory) {
        const item = itemsGacha.find(i => i.id === slot.item_id && i.role === role);
        if (item) validos.push(item);
    }
    return validos;
}

function createSelectMenu(id, chars, placeholder) {
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: c.role === 'fighter' ? `ATK:${c.stats.atk}` : `Skill: ${c.assist.name}`,
        value: c.id,
        emoji: c.emoji
    }));
    return new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options);
}