const db = require('../database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    const chId = db.getLogChannel(member.guild.id);
    if (!chId) return;
    const ch = await client.channels.fetch(chId).catch(()=>null);
    if (!ch || !ch.isTextBased) return;
    ch.send(`➡️ **${member.user.tag}** se ha unido al servidor.`);
    db.addLog(member.guild.id, 'member_join', `${member.user.tag} (${member.id})`);
  }
};