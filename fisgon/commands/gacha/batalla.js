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

    // Helpers
    const getDeck = (uid) => {
        const inv = db.getInventory(interaction.guild.id, uid);
        return inv.map(slot => allCards.find(c => c.id === slot.item_id)).filter(c => c);
    };

    const mazoP1 = getDeck(p1User.id);
    if (mazoP1.length < 1) return interaction.reply({ content: '❌ No tienes cartas.', ephemeral: true });

    let p2User, mazoP2, esNPC = false;

    if (sub === 'npc') {
        esNPC = true;
        p2User = { id: 'npc', username: '🤖 La Pesadilla', bot: true };
        const enemies = allCards.filter(c => c.stats && c.stats.hp > 0);
        if (enemies.length === 0) return interaction.reply({ content: '❌ No hay cartas de sistema para el NPC.', ephemeral: true });
        mazoP2 = Array(4).fill(0).map(() => enemies[Math.floor(Math.random() * enemies.length)]);
    } else {
        p2User = interaction.options.getUser('rival');
        if (p2User.bot || p2User.id === p1User.id) return interaction.reply({ content: '❌ Rival inválido.', ephemeral: true });
        mazoP2 = getDeck(p2User.id);
        if (mazoP2.length < 1) return interaction.reply({ content: `❌ ${p2User.username} no tiene cartas.`, ephemeral: true });
    }

    // --- SELECCIÓN DE EQUIPO P1 ---
    const equipoP1 = await selectorEquipo(interaction, p1User, mazoP1);
    if (!equipoP1) return; // Cancelado

    // --- SELECCIÓN EQUIPO P2 (AUTO para NPC, Random para P2 por simplicidad en este ejemplo) ---
    // En una versión completa harías el selectorEquipo para P2 también.
    let equipoP2;
    if (esNPC) {
        equipoP2 = {
            user: p2User,
            active: initCard(mazoP2[0]),
            bench: mazoP2.slice(1,4).map(initCard),
            isNPC: true
        };
    } else {
        interaction.followUp({ content: '⚠️ Asignando equipo aleatorio al rival...', ephemeral: true });
        equipoP2 = {
            user: p2User,
            active: initCard(mazoP2[0]),
            bench: mazoP2.slice(1,4).map(initCard),
            isNPC: false
        };
    }

    await loopBatalla(interaction, equipoP1, equipoP2);
  }
};

function initCard(c) {
    if (!c) return null;
    return {
        ...c,
        maxHp: c.stats.hp,
        currentHp: c.stats.hp,
        skill: (c.skills && c.skills[0]) ? c.skills[0] : { name: 'Ataque', type: 'dmg', power: 1 }
    };
}

async function selectorEquipo(interaction, user, mazo) {
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('sel_active').setPlaceholder('Elige tu ATACANTE (Frente)')
            .addOptions(mazo.slice(0, 25).map(c => ({ label: c.name, description: `HP: ${c.stats.hp}`, value: c.id })))
    );

    const msg = await interaction.reply({ content: `🛡️ **${user.username}**, arma tu estrategia.`, components: [row], ephemeral: true, fetchReply: true });

    try {
        const i = await msg.awaitMessageComponent({ time: 60000 });
        const active = mazo.find(c => c.id === i.values[0]);
        const resto = mazo.filter(c => c !== active);

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

        return {
            user,
            active: initCard(active),
            bench: bench.map(initCard),
            isNPC: false
        };
    } catch (e) {
        return null;
    }
}

async function loopBatalla(interaction, p1, p2) {
    let activeP = p1;
    let opponent = p2;
    let log = "¡Inicio del combate!";
    let battleOn = true;

    const channel = interaction.channel;
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
            .setImage(activeP.active.image);

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

                    // Skill Agility
                    if (sale.skill.type === 'agility') {
                        log += " (Agilidad: No pierde turno)";
                        turnEnded = false;
                    }
                    await i.deferUpdate();
                }
            } catch (e) {
                log = "⌛ Tiempo agotado.";
            }
        }

        // Check Muerte
        if (opponent.active.currentHp <= 0) {
            log += `\n💀 **${opponent.active.name}** derrotado.`;
            if (opponent.bench.length === 0) {
                finalizar(interaction, msgUI, activeP, opponent);
                return;
            }
            // Forzar cambio
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

        // Calculo Daño
        let mult = skill.type === 'dmg' ? (skill.power || 1) : 1;
        dmg = Math.floor(atkP.active.stats.atk * mult);

        // Skill Immunity
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

            const msgForce = await interaction.channel.send({ 
                content: `${player.user} ¡Tu carta cayó! Elige reemplazo:`, 
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
                // Auto-pick si no responde
                player.active = player.bench.shift();
                log += `\n⚠️ Auto-cambio por tiempo.`;
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