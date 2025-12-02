async function generarTranscripcion(channel, limit = 100) {
  const messages = [];
  let lastId = null;
  let remaining = limit;

  while (remaining > 0) {
    const options = { limit: Math.min(remaining, 100) };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    batch.forEach(msg => messages.push(msg));
    lastId = batch.last().id;
    remaining -= batch.size;
  }

  messages.reverse();

  const lines = messages.map(msg => {
    const timestamp = msg.createdAt.toISOString();
    const author = `${msg.author.tag} (${msg.author.id})`;
    let content = msg.content || '';

    if (msg.attachments.size > 0) {
      const attachmentUrls = msg.attachments.map(a => a.url).join(', ');
      content += ` [Archivos: ${attachmentUrls}]`;
    }

    if (msg.embeds.length > 0) {
      content += ` [Embed: ${msg.embeds.length} embed(s)]`;
    }

    return `[${timestamp}] ${author}: ${content}`;
  });

  return lines.join('\n');
}

module.exports = { generarTranscripcion };
