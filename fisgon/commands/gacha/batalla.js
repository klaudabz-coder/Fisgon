const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { itemsGacha } = require('../../utils/gachaItems');

// Tiempo para seleccionar personaje y para cada turno
const TIEMPO_SELECCION = 60000; 
const TIEMPO_TURNO = 30000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duelo')
    .setDescription('Reta a otro usuario a un duelo de cartas')
    .addUserOption(u => u.setName('rival').setDescription('Usuario contra quien pelear').setRequired(true)),

  async execute(interaction) {
    const p1 = interaction.user;
    const p2 = interaction.options.getUser('rival');

    if (p1.id === p2.id) return interaction.reply({ content: 'No puedes pelear contra ti mismo.', ephemeral: true });
    if (p2.bot) return interaction.reply({ content: 'No puedes pelear contra bots (aún).', ephemeral: true });

    // 1. Obtener inventarios y filtrar personajes válidos
    const inv1 = db.getInventory(interaction.guild.id, p1.id);
    const inv2 = db.getInventory(interaction.guild.id, p2.id);

    const chars1 = getFightersFromInv(inv1);
    const chars2 = getFightersFromInv(inv2);

    if (chars1.length === 0) return interaction.reply({ content: 'No tienes cartas en tu mazo. Usa /abrir para conseguir algunas.', ephemeral: true });
    if (chars2.length === 0) return interaction.reply({ content: `${p2.username} no tiene personajes de Gacha.`, ephemeral: true });

    await interaction.reply({ content: `⚔️ **¡Desafío de Duelo!**\n${p1} ha retado a ${p2}.\nAmbos deben seleccionar su luchador abajo.`, fetchReply: true });

    // 2. Crear Menús de Selección para ambos jugadores
    const row1 = new ActionRowBuilder().addComponents(createSelectMenu('p1_select', chars1, `Elección de ${p1.username}`));
    const row2 = new ActionRowBuilder().addComponents(createSelectMenu('p2_select', chars2, `Elección de ${p2.username}`));

    const msgSeleccion = await interaction.channel.send({ components: [row1, row2] });

    // Variables de la batalla
    let fighter1 = null;
    let fighter2 = null;

    const collector = msgSeleccion.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: TIEMPO_SELECCION });

    collector.on('collect', async i => {
        if (i.customId === 'p1_select') {
            if (i.user.id !== p1.id) return i.reply({ content: 'Este menú no es para ti.', ephemeral: true });
            const charId = i.values[0];
            const baseChar = itemsGacha.find(c => c.id === charId);
            fighter1 = { ...baseChar, maxHp: baseChar.stats.hp, currentHp: baseChar.stats.hp, user: p1, defMod: 0 };
            await i.reply({ content: `Has elegido a **${fighter1.name}**`, ephemeral: true });
        }

        if (i.customId === 'p2_select') {
            if (i.user.id !== p2.id) return i.reply({ content: 'Este menú no es para ti.', ephemeral: true });
            const charId = i.values[0];
            const baseChar = itemsGacha.find(c => c.id === charId);
            fighter2 = { ...baseChar, maxHp: baseChar.stats.hp, currentHp: baseChar.stats.hp, user: p2, defMod: 0 };
            await i.reply({ content: `Has elegido a **${fighter2.name}**`, ephemeral: true });
        }

        // Si ambos eligieron, inicia la pelea
        if (fighter1 && fighter2) {
            collector.stop('ready');
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason !== 'ready') {
            return interaction.channel.send('⏳ Tiempo de selección agotado. Duelo cancelado.');
        }

        // Borrar menús de selección
        await msgSeleccion.delete().catch(()=>{});

        // INICIAR BUCLE DE BATALLA
        iniciarBatalla(interaction.channel, fighter1, fighter2);
    });
  }
};

// --- LÓGICA DE BATALLA ---
async function iniciarBatalla(channel, f1, f2) {
    let turno = 1;
    // Determinar quién empieza por velocidad
    let atacante = f1.stats.spd >= f2.stats.spd ? f1 : f2;
    let defensor = atacante === f1 ? f2 : f1;

    let logBatalla = '¡Comienza el combate!';
    let finalizado = false;

    // Mensaje base
    const getEmbed = () => {
        return new EmbedBuilder()
            .setTitle(`⚔️ ${f1.name} vs ${f2.name}`)
            .setDescription(logBatalla)
            .addFields(
                { name: `${f1.emoji} ${f1.user.username}`, value: `HP: ${f1.currentHp}/${f1.maxHp}\nATK: ${f1.stats.atk} DEF: ${f1.stats.def}`, inline: true },
                { name: `${f2.emoji} ${f2.user.username}`, value: `HP: ${f2.currentHp}/${f2.maxHp}\nATK: ${f2.stats.atk} DEF: ${f2.stats.def}`, inline: true }
            )
            .setColor('#FF0000');
    };

    // Botones de acción
    const getRow = (disabled = false) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('atq').setLabel('Atacar').setStyle(ButtonStyle.Primary).setEmoji('🗡️').setDisabled(disabled),
        new ButtonBuilder().setCustomId('hab').setLabel('Habilidad').setStyle(ButtonStyle.Secondary).setEmoji('✨').setDisabled(disabled)
    );

    const msgBatalla = await channel.send({ content: `Turno de ${atacante.user}`, embeds: [getEmbed()], components: [getRow()] });

    // Bucle de turnos
    while (!finalizado) {
        try {
            const filter = i => i.user.id === atacante.user.id;
            const interaction = await msgBatalla.awaitMessageComponent({ filter, time: TIEMPO_TURNO, componentType: ComponentType.Button });

            let dmg = 0;
            let msgAccion = '';

            // Resetear defensa temporal del turno anterior del defensor
            defensor.defMod = 0;

            if (interaction.customId === 'atq') {
                // Daño = (Ataque - Defensa/2) + Aleatorio
                const defensaTotal = defensor.stats.def + defensor.defMod;
                const baseDmg = Math.max(1, atacante.stats.atk - (defensaTotal * 0.4));
                dmg = Math.floor(baseDmg * (0.9 + Math.random() * 0.2)); // +/- 10% varianza

                msgAccion = `⚔️ **${atacante.name}** atacó e hizo **${dmg}** de daño.`;
            } 
            else if (interaction.customId === 'hab') {
                // Lógica simple de habilidades
                const ab = atacante.ability;

                if (ab.type === 'heal') {
                    const heal = Math.floor(atacante.maxHp * 0.3);
                    atacante.currentHp = Math.min(atacante.maxHp, atacante.currentHp + heal);
                    msgAccion = `✨ **${atacante.name}** usó *${ab.name}* y recuperó **${heal}** HP.`;
                } 
                else if (ab.type === 'buff_def') {
                    atacante.defMod = 20; // Sube defensa temporalmente
                    msgAccion = `🛡️ **${atacante.name}** usó *${ab.name}* y subió su defensa.`;
                }
                else if (ab.type === 'pierce' || ab.type === 'magic') {
                    // Daño ignorando defensa
                    dmg = Math.floor(atacante.stats.atk * 1.5);
                    msgAccion = `🔥 **${atacante.name}** usó *${ab.name}* e hizo **${dmg}** de daño masivo.`;
                }
                else {
                    // Daño crítico
                    dmg = Math.floor(atacante.stats.atk * 2);
                    msgAccion = `💥 **${atacante.name}** usó *${ab.name}* CRÍTICAMENTE por **${dmg}** daño.`;
                }
            }

            // Aplicar daño
            if (dmg > 0) {
                defensor.currentHp -= dmg;
            }

            // Actualizar Log
            logBatalla = msgAccion;

            // Verificar Muerte
            if (defensor.currentHp <= 0) {
                defensor.currentHp = 0;
                finalizado = true;
                logBatalla += `\n💀 **${defensor.name} ha caído.** ¡${atacante.user} GANA!`;

                // Actualizar mensaje final
                const embedFin = getEmbed().setColor('#00FF00').setTitle(`👑 Victoria de ${atacante.user.username}`);
                await interaction.update({ content: 'Batalla finalizada.', embeds: [embedFin], components: [] });
                return;
            }

            // Cambiar turno
            const temp = atacante;
            atacante = defensor;
            defensor = temp;
            turno++;

            await interaction.update({ content: `Turno ${turno}: le toca a ${atacante.user}`, embeds: [getEmbed()], components: [getRow()] });

        } catch (e) {
            finalizado = true;
            await msgBatalla.edit({ content: '⏱️ Tiempo de espera agotado. Se acabó el combate.', components: [] });
        }
    }
}

// Helpers
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
    // Discord permite max 25 opciones en un select menu
    const options = chars.slice(0, 25).map(c => ({
        label: c.name,
        description: `HP:${c.stats.hp} ATK:${c.stats.atk} | ${c.ability.name}`,
        value: c.id,
        emoji: c.emoji
    }));

    return new StringSelectMenuBuilder()
        .setCustomId(id)
        .setPlaceholder(placeholder)
        .addOptions(options);
}