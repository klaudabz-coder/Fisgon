const db = require('../database');
const { xpInfoFromTotal, crearBarraProgreso } = require('../utils/levels');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

// Importación SEGURA de Misiones (Para que no crashee si no existe)
let trackQuest, QUEST_TYPES;
try {
    const quests = require('../utils/quests');
    trackQuest = quests.trackQuest;
    QUEST_TYPES = quests.QUEST_TYPES;
} catch (e) {
    // Si no existe el módulo, ignoramos
}

const XP_MIN = 10;
const XP_MAX = 20;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      if (message.author.bot || !message.guild) return;

      const guildId = message.guild.id;
      const userId = message.author.id;

      // TRACKING MISIONES (Si existe)
      if (trackQuest && QUEST_TYPES) {
          trackQuest(guildId, userId, QUEST_TYPES.MESSAGES, 1);
      }

      // cooldown
      const last = db.getLastXpTime(guildId, userId) || 0;
      const ahora = Date.now();
      if (ahora - last < COOLDOWN_MS) return;

      const xpGanado = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
      db.addXp(guildId, userId, xpGanado);
      db.setLastXpTime(guildId, userId, ahora);

      const datos = db.getLevel(guildId, userId);
      const xpTotal = datos.xp;
      const nivelAlmacenado = datos.level || 0;

      // OBTENER CONFIGURACIÓN DE NIVELES
      const levelConfig = db.getLevelConfig(guildId); 

      // Calcular info con la config personalizada
      const info = xpInfoFromTotal(xpTotal, levelConfig); 
      const nuevoNivel = info.level;

      if (nuevoNivel > nivelAlmacenado) {
        db.setLevel(guildId, userId, nuevoNivel);

        // roles de nivel
        try {
          const cfgRole = db.getLevelRole(guildId, nuevoNivel);
          const allLevelRoles = db.listLevelRoles(guildId);
          const member = await message.guild.members.fetch(userId).catch(()=>null);
          if (member) {
            for (const r of allLevelRoles) {
              try {
                if (r && r.role_id && member.roles.cache.has(r.role_id) && r.level !== nuevoNivel) {
                  await member.roles.remove(r.role_id, `Limpieza roles niveles: subir a ${nuevoNivel}`).catch(()=>{});
                }
              } catch(e) {}
            }
            if (cfgRole && cfgRole.role_id && !member.roles.cache.has(cfgRole.role_id)) {
              await member.roles.add(cfgRole.role_id, `Recompensa por subir al nivel ${nuevoNivel}`).catch(err=>{
                console.error('No se pudo asignar rol de nivel:', err);
              });
            }
          }
        } catch (e) {
          console.error('Error al gestionar roles de nivel:', e);
        }

        const embed = new EmbedBuilder()
          .setTitle(`¡Nuevo nivel! 🎉`)
          .setDescription(`**${message.author.tag}** subió al nivel **${nuevoNivel}** (ganó ${xpGanado} XP).`)
          .setColor('#ffd166')
          .setTimestamp();

        const barra = crearBarraProgreso(info.xpIntoLevel, info.xpForNext, 12);
        embed.addFields({ name: 'Progreso', value: `${barra}\nXP: ${info.xpIntoLevel}/${info.xpForNext}`, inline: false });

        const logChannelId = db.getLogChannel(guildId);
        if (logChannelId) {
            const ch = await client.channels.fetch(logChannelId).catch(()=>null);
            if (ch && ch.isTextBased && ch.send) {
              ch.send({ embeds: [embed] }).catch(()=>{});
            } else {
              const m = await message.channel.send({ embeds: [embed] }).catch(()=>null);
              if (m) setTimeout(()=>m.delete().catch(()=>{}), 10000);
            }
        } else {
            const m = await message.channel.send({ embeds: [embed] }).catch(()=>null);
            if (m) setTimeout(()=>m.delete().catch(()=>{}), 10000);
        }
      }
    } catch (err) {
      console.error('Error en messageCreate:', err);
    }
  }
};