const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database');
const { getAllCards } = require('../../utils/cardRegistry');

const TIEMPO_TURNO = 120000; // 2 minutos de espera máxima

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura')
    .setDescription('Lucha contra la IA con tu equipo (1 Atacante + 3 Defensores)'),

  async execute(interaction) {
    const user = interaction.user;
    const inv = db.getInventory(interaction.guild.id, user.id);
    const allCards = getAllCards(interaction.guild.id);

    // 1. Filtrar mis cartas
    const misCartas = [];
    for (const slot of inv) {
        const item = allCards.find(c => c.id === slot.item_id);
        if (item) misCartas.push(item);
    }

    if (misCartas.length === 0) return interaction.reply({ content: '❌ No tienes cartas. Crea una o compra sobres.', ephemeral: true });

    // --- FASE DE SELECCIÓN ---
    const rowAtk = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('sel_atk')
            .setPlaceholder('1. Selecciona tu ATACANTE Principal')
            .addOptions(misCartas.slice(0, 25).map(c => ({ label: c.name, description: `ATK: ${c.stats.atk}`, value: c.id })))
    );

    const msg = await interaction.reply({ content: '🛡️ **Fase 1:** Elige quién liderará el ataque.', components: [rowAtk], fetchReply: true });

    try {
        // Seleccionar Atacante
        const iAtk = await msg.awaitMessageComponent({ filter: i => i.user.id === user.id, time: 60000, componentType: ComponentType.StringSelect });
        const atacanteCard = misCartas.find(c => c.id === iAtk.values[0]);
        await iAtk.deferUpdate();

        // Paso 2: Elegir Defensores
        const rowDef = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('sel_def')
                .setPlaceholder('2. Selecciona hasta 3 DEFENSORES')
                .setMinValues(0)
                .setMaxValues(Math.min(3, misCartas.length))
                .addOptions(misCartas.slice(0, 25).map(c => ({ label: c.name, description: `HP: ${c.stats.hp} | Skill: ${c.skills.def.name}`, value: c.id })))
        );

        await msg.edit({ content: `✅ Atacante: **${atacanteCard.name}**\n🛡️ **Fase 2:** Elige tu equipo de defensa.`, components: [rowDef] });

        const iDef = await msg.awaitMessageComponent({ filter: i => i.user.id === user.id, time: 60000, componentType: ComponentType.StringSelect });
        const defensoresCards = iDef.values.map(id => misCartas.find(c => c.id === id));
        await iDef.deferUpdate();

        // Generar Enemigo (IA)
        const poolEnemigos = allCards.filter(c => c.stats && c.stats.hp > 0);
        if (poolEnemigos.length === 0) return interaction.followUp({ content: '❌ No hay enemigos configurados.', ephemeral: true });
        const enemigoCard = poolEnemigos[Math.floor(Math.random() * poolEnemigos.length)];

        // INICIAR BATALLA
        await iniciarBatalla(interaction, msg, user, atacanteCard, defensoresCards, enemigoCard);

    } catch (e) {
        // console.error(e);
        await interaction.editReply({ content: '⏳ Tiempo agotado.', components: [] }).catch(()=>{});
    }
  }
};

async function iniciarBatalla(interaction, message, user, cAtk, cDefs, cEnemy) {
    // Configurar Jugador
    const player = {
        attacker: { ...cAtk, maxHp: cAtk.stats.hp, currentHp: cAtk.stats.hp, defMode: false },
        defenders: cDefs.map((c, i) => ({ ...c, id_game: i, usedTurn: false, maxHp: c.stats.hp, currentHp: c.stats.hp })),
        imageBig: cAtk.image // Imagen a mostrar en el embed
    };

    // Configurar Enemigo
    const enemy = {
        name: cEnemy.name,
        image: cEnemy.image,
        maxHp: cEnemy.stats.hp,
        hp: cEnemy.stats.hp,
        atk: cEnemy.stats.atk,
        skills: cEnemy.skills || { atk: {name:'Golpe', power:1}, def: {name:'Guardia', power:20} },
        subtype: cEnemy.subtype || 'Normal',
        defMode: false
    };

    let log = "¡Comienza la aventura!";
    let batallaActiva = true;

    while (batallaActiva) {

        const embed = new EmbedBuilder()
            .setTitle(`Batalla vs ${enemy.name} (${enemy.subtype})`)
            .setColor('#2f3136')
            .setImage(player.imageBig)
            .setDescription(`
                **Viendo:** ${player.imageBig === player.attacker.image ? 'Líder (Atacante)' : 'Carta Seleccionada'}

                ⚔️ **${player.attacker.name}** (Tú)
                ❤️ HP: ${player.attacker.currentHp}/${player.attacker.maxHp}

                👾 **${enemy.name}** (Enemigo)
                ❤️ HP: ${enemy.hp}/${enemy.maxHp}

                📜 **Log:**
                ${log}
            `)
            .setFooter({ text: 'Cambiar de líder consume tu turno.' });

        // Estado visual del equipo en fields
        let teamStatus = '';
        player.defenders.forEach(d => {
            teamStatus += `🛡️ **${d.name}**: ${d.currentHp} HP ${d.usedTurn ? '(Agotado)' : ''}\n`;
        });
        if(teamStatus) embed.addFields({ name: 'Banca / Defensores', value: teamStatus });

        // --- COMPONENTES ---
        const rowAtk = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('atk_normal').setLabel('⚔️ Atacar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('atk_skill').setLabel(`💥 ${player.attacker.skills.atk.name}`).setStyle(ButtonStyle.Danger)
        );

        const rowDef = new ActionRowBuilder();
        player.defenders.forEach((d, i) => {
            rowDef.addComponents(
                new ButtonBuilder().setCustomId(`def_skill_${i}`).setLabel(`${d.skills.def.name}`).setStyle(ButtonStyle.Secondary).setDisabled(d.usedTurn)
            );
        });

        // Menú Inspección
        const opcionesInspect = [
            { label: `Ver Atacante: ${player.attacker.name}`, value: 'view_atk', emoji: '⚔️' }
        ];
        player.defenders.forEach((d, i) => {
            opcionesInspect.push({ label: `Ver Defensor: ${d.name}`, value: `view_def_${i}`, emoji: '🛡️' });
        });
        const rowInspect = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('inspect_menu').setPlaceholder('👁️ Ver estadísticas').addOptions(opcionesInspect)
        );

        // Menú CAMBIO DE LÍDER (Solo si hay defensores)
        let rowSwap = null;
        if (player.defenders.length > 0) {
            const opcionesSwap = player.defenders.map((d, i) => ({
                label: `Relevar con: ${d.name}`,
                description: `HP: ${d.currentHp} | Entra al ataque`,
                value: `swap_${i}`,
                emoji: '🔄'
            }));
            rowSwap = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('swap_menu').setPlaceholder('🔄 Relevar Líder (Gasta Turno)').addOptions(opcionesSwap)
            );
        }

        const componentes = [rowAtk];
        if (rowDef.components.length > 0) componentes.push(rowDef);
        componentes.push(rowInspect);
        if (rowSwap) componentes.push(rowSwap);

        await message.edit({ content: '', embeds: [embed], components: componentes });

        try {
            const i = await message.awaitMessageComponent({ filter: x => x.user.id === user.id, time: TIEMPO_TURNO });

            // A) INSPECCIÓN
            if (i.customId === 'inspect_menu') {
                const val = i.values[0];
                if (val === 'view_atk') player.imageBig = player.attacker.image;
                else {
                    const idx = parseInt(val.split('_')[2]);
                    player.imageBig = player.defenders[idx].image;
                }
                await i.deferUpdate();
                continue;
            }

            // B) HABILIDAD DEFENSA (Gratis)
            if (i.customId.startsWith('def_skill_')) {
                const idx = parseInt(i.customId.split('_')[2]);
                const defensor = player.defenders[idx];
                const poder = defensor.skills.def.power;

                player.attacker.currentHp += Math.floor(poder / 2);
                if(player.attacker.currentHp > player.attacker.maxHp) player.attacker.currentHp = player.attacker.maxHp;

                defensor.usedTurn = true;
                log = `🛡️ **${defensor.name}** usa *${defensor.skills.def.name}* para curar al líder.`;
                await i.deferUpdate();
                continue;
            }

            // --- ACCIONES QUE GASTAN TURNO (ATAQUE O SWAP) ---
            let playerActionLog = '';

            // C) SWAP (Cambio de líder)
            if (i.customId === 'swap_menu') {
                const idx = parseInt(i.values[0].split('_')[1]);
                const nuevoAtacante = player.defenders[idx];
                const viejoAtacante = player.attacker;

                // Intercambio
                player.defenders[idx] = viejoAtacante;
                player.attacker = nuevoAtacante;

                // Actualizar visuales
                player.imageBig = player.attacker.image;
                player.attacker.defMode = false; // El nuevo atacante entra sin guardia

                playerActionLog = `🔄 **Cambio táctico:** ${viejoAtacante.name} se retira y entra **${nuevoAtacante.name}**.`;
            }

            // D) ATAQUE NORMAL
            else if (i.customId.startsWith('atk_')) {
                let dmg = 0;
                let skillName = '';

                if (i.customId === 'atk_normal') {
                    dmg = player.attacker.stats.atk;
                    skillName = 'un ataque básico';
                } else {
                    const mult = player.attacker.skills.atk.power;
                    dmg = Math.floor(player.attacker.stats.atk * mult);
                    skillName = `**${player.attacker.skills.atk.name}**`;
                }

                // Reducción si el enemigo estaba defendiendo (IA simple)
                if (enemy.defMode) {
                    dmg = Math.floor(dmg * 0.5);
                    enemy.defMode = false; // Rompe guardia
                }

                enemy.hp -= dmg;
                playerActionLog = `⚔️ **${player.attacker.name}** usa ${skillName} e inflige **${dmg}** daño.`;
            }

            // --- RESOLUCIÓN DEL TURNO ---

            // 1. Verificar Victoria
            if (enemy.hp <= 0) {
                await i.update({ content: '🏆 **¡VICTORIA!** Enemigo derrotado.', components: [], embeds: [] });
                db.addBalance(interaction.guild.id, user.id, 100);
                batallaActiva = false;
                break;
            }

            // 2. Turno del Enemigo (IA)
            // IA Simple: 20% defensa, 80% ataque
            let enemyLog = '';
            if (Math.random() < 0.2) {
                enemy.defMode = true;
                enemyLog = `🛡️ **${enemy.name}** se pone en posición defensiva.`;
            } else {
                let dmgEnemy = enemy.atk;
                // Si la IA usa skill (50% chance)
                if (Math.random() < 0.5) dmgEnemy = Math.floor(dmgEnemy * enemy.skills.atk.power);

                player.attacker.currentHp -= dmgEnemy;
                enemyLog = `👾 **${enemy.name}** ataca e inflige **${dmgEnemy}** daño a tu líder.`;
            }

            // 3. Verificar Derrota
            if (player.attacker.currentHp <= 0) {
                await i.update({ content: `💀 **DERROTA...** Tu líder ${player.attacker.name} ha caído.`, components: [], embeds: [] });
                batallaActiva = false;
                break;
            }

            // 4. Preparar siguiente turno
            log = `${playerActionLog}\n${enemyLog}`;
            player.defenders.forEach(d => d.usedTurn = false); // Reset skills defensores

            await i.deferUpdate();

        } catch (e) {
            console.error(e);
            batallaActiva = false;
            await message.edit({ content: '⏳ Tiempo agotado.', components: [] });
        }
    }
}