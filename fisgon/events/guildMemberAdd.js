const db = require('../database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    const guildId = member.guild.id;

    // 1. Logs de Bienvenida (Código existente)
    const chId = db.getLogChannel(guildId);
    if (chId) {
      const ch = await client.channels.fetch(chId).catch(()=>null);
      if (ch && ch.isTextBased()) {
        ch.send(`➡️ **${member.user.tag}** se ha unido al servidor.`);
      }
    }
    db.addLog(guildId, 'member_join', `${member.user.tag} (${member.id})`);

    // 2. AUTOROL (Código Nuevo)
    const roleId = db.getAutoRole(guildId);
    if (roleId) {
        // Obtenemos el rol del servidor
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            try {
                await member.roles.add(role);
                console.log(`[Autorol] Rol ${role.name} asignado a ${member.user.tag}`);
            } catch (err) {
                console.error(`[Autorol] Error asignando rol a ${member.user.tag}:`, err.message);
                // Si falla (por permisos), opcionalmente avisar en el canal de logs
                if (chId) {
                    const ch = await client.channels.fetch(chId).catch(()=>null);
                    if(ch) ch.send(`⚠️ No pude dar el autorol a ${member.user.tag}. Revisa mis permisos.`);
                }
            }
        }
    }
  }
};