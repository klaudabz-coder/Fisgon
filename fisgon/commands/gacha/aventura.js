const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { itemsGacha } = require('../../utils/gachaItems');

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

    // Todas las cartas sirven
    const allCards = getFightersFromInv(inv);

    if (allCards.length === 0) return interaction.reply({ content: '❌ No tienes cartas. Usa `/cartas-abrir`.', ephemeral: true });

    // FASE 1: LUCHADOR
    const row1 = new ActionRowBuilder().addComponents(createSelectMenu('sel_fighter', allCards, 'Elige tu LUCHADOR (Posición Ataque)'));
    const carga = db.getAdventureCharge(interaction.guild.id, user.id);

    const msg = await interaction.reply({ 
        content: `⚔️ **Aventura** (Carga: ${carga}%)\n🛡️ Elige quién peleará al frente:`, 
        components: [row1],
        fetchReply: true
    });

    const filter = i => i.user.id === user.id;
    let fighterItem, supportItem;

    try {
        const sel1 = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
        fighterItem = itemsGacha.find(c => c.id === sel1.values[0]);
        await sel1.deferUpdate();

        // Filtrar para no elegir el mismo (si solo tiene 1 copia)
        // Por simplicidad, permitimos repetir si tienen >1 copia, o mostramos todas.
        const row2 = new ActionRowBuilder().addComponents(createSelectMenu('sel_support', allCards, 'Elige tu SOPORTE (Posición Ayuda)'));

        await msg.edit({ content: `✅ Luchador: **${fighterItem.name}**\n🔮 Elige quién le dará soporte:`, components: [row2] });

        try {
            const sel2 = await msg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
            supportItem = itemsGacha.find(c => c.id === sel2.values[0]);
            await sel2.deferUpdate();
        } catch (e) {
            // Si no elige, va solo
        }

        // Rival Aleatorio
        const npcCard = itemsGacha[Math.floor(Math.random() * itemsGacha.length)];

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
        emoji: fighterCard.emoji,
        stats: { ...fighterCard.stats },
        maxHp: fighterCard.stats.hp,
        currentHp: fighterCard.stats.hp,
        skills: fighterCard.skills.map(s => ({ ...s, currentCd: 0 })),
        buffs: { atk: 0, def: 0 },
        shield: 0
    };

    // SOPORTE Y SINERGIA
    let synergyMsg = "";
    const support = supportCard ? {
        name: supportCard.name,
        skill: { ...supportCard.assist, currentCd: 0 }
    } : null;

    if (support && supportCard.synergy && supportCard.synergy.target === fighterCard.id) {
        synergyMsg = `\n⚡ **¡SINERGIA ACTIVADA!** ${supportCard.synergy.name}: ${supportCard.synergy.desc}`;

        // Aplicar bonos de ejemplo (puedes personalizar según la descripción)
        if (supportCard.synergy.desc.includes('ATK')) player.stats.atk += 30;
        if (supportCard.synergy.desc.includes('HP')) {
            player.maxHp += 80;
            player.currentHp += 80;
        }
    }

    // NPC
    const npc = {
        name: `NPC ${npcCard.name}`,
        emoji: npcCard.emoji,
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
    let log = `¡Comienza el combate!${synergyMsg}`;
    let batallaActiva = true;

    while (batallaActiva) {

        // Construir Info Habilidades
        let skillInfo = "\n\n**Habilidades:**";
        player.skills.forEach((s, i) => {
            const cdInfo = s.currentCd > 0 ? `⏳${s.currentCd}` : '✅';
            skillInfo += `\n**${i+1}.** ${s.name} (${cdInfo}): ${s.desc}`;
        });
        if (support) {
            const s = support.skill;
            const cdInfo = s.currentCd > 0 ? `⏳${s.currentCd}` : '✅';
            skillInfo += `\n**🔮 Apoyo:** ${s.name} (${cdInfo}): ${s.desc}`;
        }

        // DIBUJAR INTERFAZ
        const embed = new EmbedBuilder()
            .setTitle(`Turno ${turno} - ${player.name} vs ${npc.name}`)
            .setDescription(log + skillInfo)
            .setColor(dificultad === 'hard' ? '#FF4444' : '#44FF44')
            .addFields(
                { name: `${player.emoji} Tú`, value: `❤️ ${player.currentHp}/${player.maxHp} ${player.shield>0?`🛡️${player.shield}`:''}`, inline: true },
                { name: `${npc.emoji} Rival`, value: `❤️ ${npc.currentHp}/${npc.maxHp} ${npc.shield>0?`🛡️${npc.shield}`:''}`, inline: true }
            );

        // BOTONES CON STATS
        const rowSkills = new ActionRowBuilder();
        const atkTotal = player.stats.atk + player.buffs.atk;

        player.skills.forEach((skill, index) => {
            let info = "";
            if (skill.type === 'dmg') info = `⚔️~${Math.floor(atkTotal * skill.power)}`;
            else if (skill.type === 'heal') info = `❤️+${skill.power}`;
            else if (skill.type === 'shield') info = `🛡️+${skill.power}`;
            else info = `✨Effect`;

            rowSkills.addComponents(
                new ButtonBuilder()
                    .setCustomId(`skill_${index}`)
                    .setLabel(`${skill.name} [${info}]`)
                    .setStyle(skill.currentCd > 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(skill.currentCd > 0)
            );
        });

        if (support) {
            const s = support.skill;
            rowSkills.addComponents(
                new ButtonBuilder()
                    .setCustomId('support')
                    .setLabel(`🔮 Apoyo`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(s.currentCd > 0)
            );
        }

        await message.edit({ content: '', embeds: [embed], components: [rowSkills] });

        // TURNO JUGADOR
        try {
            const iAction = await message.awaitMessageComponent({ filter: i => i.user.id === user.id, time: TIEMPO_TURNO });

            let actionLog = '';

            if (iAction.customId.startsWith('skill_')) {
                const idx = parseInt(iAction.customId.split('_')[1]);
                actionLog = ejecutarHabilidad(player.skills[idx], player, npc);
                player.skills[idx].currentCd = player.skills[idx].cd + 1;
            } else {
                actionLog = `🔮 **Apoyo:** ${ejecutarHabilidad(support.skill, player, npc)}`;
                support.skill.currentCd = support.skill.cd + 1;
            }

            await iAction.update({ components: [] });

            if (npc.currentHp <= 0) {
                batallaActiva = false;
                await finalizar(message, interaction, user, true, dificultad, actionLog);
                return;
            }

            // TURNO NPC
            await wait(1500);
            const avail = npc.skills.filter(s => s.currentCd === 0);
            const npcSkill = avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : npc.skills[0];

            const npcLog = ejecutarHabilidad(npcSkill, npc, player);
            if (npcSkill.cd) npcSkill.currentCd = npcSkill.cd + 1;

            log = `${actionLog}\n${npcLog}`;

            if (player.currentHp <= 0) {
                batallaActiva = false;
                await finalizar(message, interaction, user, false, dificultad, log);
                return;
            }

            // RESETS
            [...player.skills, ...(support ? [support.skill] : []), ...npc.skills].forEach(s => { if(s.currentCd > 0) s.currentCd--; });
            turno++;

        } catch (e) {
            batallaActiva = false;
            await message.edit({ content: 'Tiempo agotado.', components: [] });
        }
    }
}

function ejecutarHabilidad(skill, caster, target) {
    let msg = `**${caster.name}** usa *${skill.name}*...`;
    const atk = caster.stats.atk + (caster.buffs?.atk || 0);
    const def = target.stats.def + (target.buffs?.def || 0);

    if (skill.type === 'dmg') {
        let dmg = Math.floor((atk * skill.power) - (def * 0.3));
        if (dmg < 1) dmg = 1;
        if (target.shield > 0) {
            const abs = Math.min(target.shield, dmg);
            target.shield -= abs; dmg -= abs;
            msg += ` (Escudo -${abs})`;
        }
        target.currentHp -= dmg;
        msg += ` ¡${dmg} daño!`;
    } else if (skill.type === 'heal') {
        const heal = skill.power;
        caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
        msg += ` +${heal} HP.`;
    } else if (skill.type === 'shield') {
        caster.shield = (caster.shield || 0) + skill.power;
        msg += ` +${skill.power} Escudo.`;
    } else if (skill.type === 'buff_atk') {
        caster.buffs.atk += skill.power;
        msg += ` +${skill.power} ATK.`;
    } else if (skill.type === 'buff_def') {
        caster.buffs.def += skill.power;
        msg += ` +${skill.power} DEF.`;
    } else if (skill.type === 'reduce_cd') {
        msg += ` bajó Cooldowns.`;
    } else if (skill.type === 'debuff_spd') {
        msg += ` ralentizó al rival.`;
    }
    return msg;
}

async function finalizar(message, interaction, user, win, diff, log) {
    const embed = new EmbedBuilder().setDescription(log).setTitle(win ? '🏆 ¡VICTORIA!' : '💀 DERROTA').setColor(win ? '#00FF00' : '#FF0000');

    if (win) {
        const premio = diff === 'hard' ? RECOMPENSA_BASE * 2 : RECOMPENSA_BASE;
        db.addBalance(interaction.guild.id, user.id, premio);
        const carga = diff === 'hard' ? 35 : 20;
        const nueva = db.addAdventureCharge(interaction.guild.id, user.id, carga);

        let extra = '';
        if (nueva >= 100) {
            db.setAdventureCharge(interaction.guild.id, user.id, nueva - 100);
            const carta = itemsGacha.find(c => c.rarity !== 'Common') || itemsGacha[0];
            db.addToInventory(interaction.guild.id, user.id, carta.id, 1);
            extra = `\n✨ **¡Atrapasueños lleno!** Obtuviste: **${carta.name}**`;
        }
        embed.addFields({ name: 'Botín', value: `💰 +${premio}\n🕸️ Carga: ${nueva}% (+${carga}%)${extra}` });
    }
    await message.edit({ embeds: [embed], components: [] });
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

function createSelectMenu(id, chars, placeholder) {
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: `HP:${c.stats.hp} ATK:${c.stats.atk}`,
        value: c.id,
        emoji: c.emoji
    }));
    return new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options);
}