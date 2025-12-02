const db = require('../database');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    if (!message.guild) return;
    const chId = db.getLogChannel(message.guild.id);
    if (!chId) return;
    const ch = await client.channels.fetch(chId).catch(()=>null);
    if (!ch || !ch.isTextBased) return;
    const author = message.author ? `${message.author.tag} (${message.author.id})` : 'Desconocido';
    const content = message.content || '[sin texto]';
    ch.send(`🗑️ Mensaje borrado por ${author}: "${content}"`);
    db.addLog(message.guild.id, 'message_delete', `${author}: ${content}`);
  }
};