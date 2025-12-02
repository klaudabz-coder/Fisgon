const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

async function crearTicket(client, guild, user, motivo = 'Sin motivo') {
  const db = client.db;
  const cfg = db.getTicketConfig(guild.id);
  
  if (!cfg || !cfg.category_id) {
    throw new Error('El sistema de tickets no está configurado. Usa /tickets-configurar primero.');
  }

  const ticketNum = db.incrementTicketCount(guild.id);
  const channelName = `ticket-${ticketNum.toString().padStart(4, '0')}`;

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  if (cfg.support_role_id) {
    permissionOverwrites.push({
      id: cfg.support_role_id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cfg.category_id,
    permissionOverwrites
  });

  db.addTicket(channel.id, guild.id, user.id);

  const embed = new EmbedBuilder()
    .setTitle('Ticket Abierto')
    .setDescription(`Bienvenido ${user}, un miembro del equipo te atenderá pronto.\n\n**Motivo:** ${motivo}`)
    .setColor('#60a5fa')
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Reclamar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💼'),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Cerrar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

  await channel.send({ embeds: [embed], components: [row] });

  return channel;
}

module.exports = { crearTicket };
