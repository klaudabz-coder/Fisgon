const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAllCards } = require('../../utils/cardRegistry');

const TIEMPO_PREPARACION = 120000;
const TIEMPO_TURNO = 60000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duelo')
    .setDescription('Reta a otro usuario a un duelo táctico (1 Atacante + 3 Defensores)')
    .addUserOption(u => u.setName('rival').setDescription('Usuario contra quien pelear').setRequired(true)),

  async execute(interaction) {
    const p1User = interaction.user;
    const p2User = interaction.options.getUser('rival');

    if (p1User.id === p2User.id || p2User.bot) return interaction.reply({ content: '❌ Rival inválido.', ephemeral: true });

    // 1. Validar Inventarios
    const allCards = getAllCards(interaction.guild.id);
    const getCartasUser = (uid) => {
        const inv = db.getInventory(interaction.guild.id, uid);
        const cartas = [];
        for (const slot of inv) {
            const item = allCards.find(c => c.id === slot.item_id);
            if (item) cartas.push(item);
        }
        return cartas;
    };

    const cartasP1 = getCartasUser(p1User.id);
    const cartasP2 = getCartasUser(p2User.id);

    if (cartasP1.length === 0) return interaction.reply({ content: '❌ No tienes cartas para pelear.', ephemeral: true });
    if (cartasP2.length === 0) return interaction.reply({ content: `❌ ${p2User.username} no tiene cartas.`, ephemeral: true });

    // 2. Fase de Invitación y Preparación
    const btnJoin = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_p1').setLabel(`Configurar Equipo (${p1User.username})`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('join_p2').setLabel(`Configurar Equipo (${p2User.username})`).setStyle(ButtonStyle.Primary)
    );

    const embedIntro = new EmbedBuilder()
        .setTitle('⚔️ Desafío de Duelo')
        .setDescription(`${p1User} ha retado a ${p2User}.\n\nAmbos deben pulsar su botón para configurar su equipo en secreto.\n**Reglas:**\n- 1 Atacante (Líder)\n- Hasta 3 Defensores (Soporte)\n- Puedes cambiar al atacante gastando turno.`)
        .setColor('#5865F2');

    const msg = await interaction.reply({ content: `¡${p2User}, te han retado!`, embeds: [embedIntro], components: [btnJoin], fetchReply: true });

    const equipos = { p1: null, p2: null };

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: TIEMPO_PREPARACION });

    collector.on('collect', async i => {
        const esP1 = i.user.id === p1User.id && i.customId === 'join_p1';
        const esP2 = i.user.id === p2User.id && i.customId === 'join_p2';

        if (!esP1 && !esP2) return i.reply({ content: 'Este botón no es para ti.', ephemeral: true });

        const playerKey = esP1 ? 'p1' : 'p2';
        const misCartas = esP1 ? cartasP1 : cartasP2;

        if (equipos[playerKey]) return i.reply({ content: '✅ Ya tienes tu equipo listo.', ephemeral: true });

        // --- SELECCIÓN PRIVADA ---
        const rowAtk = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('sel_atk').setPlaceholder('Elige tu ATACANTE Principal')
                .addOptions(misCartas.slice(0, 25).map(c => ({ label: c.name, description: `ATK: ${c.stats.atk} HP: ${c.stats.hp}`, value: c.id })))
        );

        const msgSelect = await i.reply({ content: '🛡️ **Paso 1:** Selecciona tu carta líder.', components: [rowAtk], ephemeral: true, fetchReply: true });

        try {
            const selAtk = await awaitKfSelect(msgSelect, i.user.id);
            if (!selAtk) return;

            const atacante = misCartas.find(c => c.id === selAtk.values[0]);

            const rowDef = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('sel_def').setPlaceholder('Elige hasta 3 DEFENSORES')
                    .setMinValues(0).setMaxValues(Math.min(3, misCartas.length))
                    .addOptions(misCartas.slice(0, 25).map(c => ({ label: c.name, description: `HP: ${c.stats.hp} | Skill: ${c.skills.def.name}`, value: c.id })))
            );

            await selAtk.update({ content: `✅ Líder: **${atacante.name}**\n🛡️ **Paso 2:** Selecciona tus soportes defensivos.`, components: [rowDef] });

            const selDef = await awaitKfSelect(msgSelect, i.user.id);
            if (!selDef) return;

            const defensores = selDef.values.map(id => misCartas.find(c => c.id === id));

            equipos[playerKey] = {
                user: esP1 ? p1User : p2User,
                attacker: { ...atacante, maxHp: atacante.stats.hp, currentHp: atacante.stats.hp, defMode: false },
                defenders: defensores.map((d, idx) => ({ ...d, id_game: idx, usedTurn: false, maxHp: d.stats.hp, currentHp: d.stats.hp })),
                imageBig: atacante.image
            };

            await selDef.update({ content: '✅ **Equipo registrado.** Esperando al oponente...', components: [] });

            if (equipos.p1 && equipos.p2) collector.stop('listos');

        } catch (e) { }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'listos') await iniciarBatallaPvP(interaction, msg, equipos.p1, equipos.p2);
        else await msg.edit({ content: '⏳ Tiempo agotado.', components: [] });
    });
  }
};

async function awaitKfSelect(message, userId) {
    try {
        return await message.awaitMessageComponent({ 
            filter: i => i.user.id === userId && i.componentType === ComponentType.StringSelect, 
            time: 60000 
        });
    } catch (e) { return null; }
}

async function iniciarBatallaPvP(interaction, message, p1, p2) {
    let turnoP1 = p1.attacker.stats.spd >= p2.attacker.stats.spd;
    let batallaActiva = true;
    let log = "¡El duelo ha comenzado!";

    while (batallaActiva) {
        const activePlayer = turnoP1 ? p1 : p2;
        const opponent = turnoP1 ? p2 : p1;

        // Reset visual de defensores para este turno
        activePlayer.defenders.forEach(d => d.usedTurn = false);

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${p1.user.username} vs ${p2.user.username}`)
            .setColor(turnoP1 ? '#5865F2' : '#F25858')
            .setImage(activePlayer.imageBig)
            .setDescription(`
                📢 **Turno de ${activePlayer.user}**
                **Viendo:** ${activePlayer.imageBig === activePlayer.attacker.image ? 'Líder' : 'Carta Seleccionada'}

                🔵 **${p1.user.username}** (Líder: ${p1.attacker.name})
                ❤️ HP: ${p1.attacker.currentHp}/${p1.attacker.maxHp}

                🔴 **${p2.user.username}** (Líder: ${p2.attacker.name})
                ❤️ HP: ${p2.attacker.currentHp}/${p2.attacker.maxHp}

                📜 **Log:**
                ${log}
            `)
            .setFooter({ text: 'Cambiar de atacante consume el turno.' });

        // --- BOTONES ---
        // 1. Ataque
        const rowAtk = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('atk_normal').setLabel('⚔️ Atacar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('atk_skill').setLabel(`💥 ${activePlayer.attacker.skills.atk.name}`).setStyle(ButtonStyle.Danger)
        );

        // 2. Defensa
        const rowDef = new ActionRowBuilder();
        activePlayer.defenders.forEach((d, i) => {
            rowDef.addComponents(
                new ButtonBuilder().setCustomId(`def_skill_${i}`).setLabel(`${d.skills.def.name}`).setStyle(ButtonStyle.Secondary).setDisabled(d.usedTurn)
            );
        });

        // 3. Inspección
        const opcionesInspect = [
            { label: `Ver Atacante: ${activePlayer.attacker.name}`, value: 'view_atk', emoji: '⚔️' }
        ];
        activePlayer.defenders.forEach((d, i) => {
            opcionesInspect.push({ label: `Ver Defensor: ${d.name}`, value: `view_def_${i}`, emoji: '🛡️' });
        });
        const rowInspect = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('inspect_menu').setPlaceholder('👁️ Inspeccionar carta').addOptions(opcionesInspect)
        );

        // 4. CAMBIO DE LÍDER (Swap)
        const opcionesSwap = activePlayer.defenders.map((d, i) => ({
            label: `Cambiar por: ${d.name}`,
            description: `HP Actual: ${d.currentHp}`,
            value: `swap_${i}`,
            emoji: '🔄'
        }));

        const rowSwap = opcionesSwap.length > 0 ? new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('swap_menu').setPlaceholder('🔄 Relevar Líder (Gasta turno)').addOptions(opcionesSwap)
        ) : null;

        const components = [rowAtk];
        if (rowDef.components.length > 0) components.push(rowDef);
        components.push(rowInspect);
        if (rowSwap) components.push(rowSwap);

        await message.edit({ content: `🔔 Turno de ${activePlayer.user}`, embeds: [embed], components: components });

        try {
            const i = await message.awaitMessageComponent({ 
                filter: int => int.user.id === activePlayer.user.id, 
                time: TIEMPO_TURNO 
            });

            // A) INSPECCIÓN
            if (i.customId === 'inspect_menu') {
                const val = i.values[0];
                if (val === 'view_atk') activePlayer.imageBig = activePlayer.attacker.image;
                else {
                    const idx = parseInt(val.split('_')[2]);
                    activePlayer.imageBig = activePlayer.defenders[idx].image;
                }
                await i.deferUpdate();
                continue;
            }

            // B) DEFENSA (Gratis)
            if (i.customId.startsWith('def_skill_')) {
                const idx = parseInt(i.customId.split('_')[2]);
                const defensor = activePlayer.defenders[idx];
                const poder = defensor.skills.def.power;
                activePlayer.attacker.currentHp += Math.floor(poder / 2);
                if (activePlayer.attacker.currentHp > activePlayer.attacker.maxHp) activePlayer.attacker.currentHp = activePlayer.attacker.maxHp;
                defensor.usedTurn = true;
                log = `🛡️ **${defensor.name}** usa *${defensor.skills.def.name}* apoyando al líder.`;
                await i.deferUpdate();
                continue;
            }

            // C) CAMBIO DE LÍDER (Gasta Turno)
            if (i.customId === 'swap_menu') {
                const idx = parseInt(i.values[0].split('_')[1]);
                const nuevoAtacante = activePlayer.defenders[idx];
                const viejoAtacante = activePlayer.attacker;

                // Intercambio
                activePlayer.defenders[idx] = viejoAtacante;
                activePlayer.attacker = nuevoAtacante;

                // Reset de flags visuales para el nuevo atacante (por si acaso)
                activePlayer.attacker.defMode = false;
                activePlayer.imageBig = activePlayer.attacker.image;

                log = `🔄 **${activePlayer.user.username}** cambia de líder.\n**${viejoAtacante.name}** se retira herido y entra **${nuevoAtacante.name}**.`;

                turnoP1 = !turnoP1;
                await i.deferUpdate();
                continue; // Siguiente turno (del rival)
            }

            // D) ATAQUE (Gasta Turno)
            if (i.customId.startsWith('atk_')) {
                let dmg = 0;
                let desc = '';
                if (i.customId === 'atk_normal') {
                    dmg = activePlayer.attacker.stats.atk;
                    desc = 'ataque básico';
                } else {
                    const mult = activePlayer.attacker.skills.atk.power;
                    dmg = Math.floor(activePlayer.attacker.stats.atk * mult);
                    desc = `**${activePlayer.attacker.skills.atk.name}**`;
                }

                opponent.attacker.currentHp -= dmg;
                log = `⚔️ **${activePlayer.attacker.name}** usa ${desc} e inflige **${dmg}** de daño.`;

                if (opponent.attacker.currentHp <= 0) {
                    opponent.attacker.currentHp = 0;
                    const embedWin = new EmbedBuilder()
                        .setTitle('🏆 ¡Duelo Finalizado!')
                        .setDescription(`🎉 **${activePlayer.user} gana la batalla.**\n\nEl líder ${opponent.attacker.name} ha caído.`)
                        .setColor('#FFD700')
                        .setImage(activePlayer.attacker.image);
                    await i.update({ content: '', embeds: [embedWin], components: [] });
                    db.addBalance(interaction.guild.id, activePlayer.user.id, 50);
                    batallaActiva = false;
                    break;
                }

                turnoP1 = !turnoP1;
                await i.deferUpdate();
            }

        } catch (e) {
            batallaActiva = false;
            await message.edit({ content: '⏱️ Tiempo agotado.', components: [] });
        }
    }
}