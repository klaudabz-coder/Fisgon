// XP por mensaje, cooldowns, subida de nivel con rol automático
const db = require('../database');
const { xpInfoFromTotal, crearBarraProgreso } = require('../utils/levels');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

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

      const info = xpInfoFromTotal(xpTotal);
      const nuevoNivel = info.level;

      if (nuevoNivel > nivelAlmacenado) {
        db.setLevel(guildId, userId, nuevoNivel);

        // roles de nivel: asignar rol y limpiar roles anteriores
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

        // Usar solo barra de progreso en texto (canvas removido)
        let imagenBuffer = null;

        const embed = new EmbedBuilder()
          .setTitle(`¡Nuevo nivel! 🎉`)
          .setDescription(`**${message.author.tag}** subió al nivel **${nuevoNivel}** (ganó ${xpGanado} XP).`)
          .setColor('#ffd166')
          .setTimestamp();

        const logChannelId = db.getLogChannel(guildId);
        if (imagenBuffer) {
          const attachment = new AttachmentBuilder(imagenBuffer, { name: 'progreso.png' });
          embed.setImage('attachment://progreso.png');
          if (logChannelId) {
            const ch = await client.channels.fetch(logChannelId).catch(()=>null);
            if (ch && ch.isTextBased && ch.send) {
              await ch.send({ embeds: [embed], files: [attachment] }).catch(()=>{});
            } else {
              const m = await message.channel.send({ embeds: [embed], files: [attachment] }).catch(()=>null);
              if (m) setTimeout(()=>m.delete().catch(()=>{}), 10000);
            }
          } else {
            const m = await message.channel.send({ embeds: [embed], files: [attachment] }).catch(()=>null);
            if (m) setTimeout(()=>m.delete().catch(()=>{}), 10000);
          }
        } else {
          const barra = crearBarraProgreso(info.xpIntoLevel, info.xpForNext, 12);
          embed.addFields({ name: 'Progreso', value: `${barra}\nXP: ${info.xpIntoLevel}/${info.xpForNext}`, inline: false });
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
      }
    } catch (err) {
      console.error('Error en messageCreate:', err);
    }
  }
};