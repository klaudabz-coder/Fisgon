const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database');

async function crearTicket(client, guild, user, motivo = 'Sin motivo') {
  const cfg = db.getTicketConfig(guild.id);

  if (!cfg || !cfg.category_id) {
    throw new Error('El sistema de tickets no está configurado. Usa /tickets-configurar primero.');
  }

  const ticketNum = db.incrementTicketCount(guild.id);
  const channelName = `ticket-${ticketNum.toString().padStart(4, '0')}`;

  // --- PERMISSION CONFIGURATION (PRIVACY) ---
  const permissionOverwrites = [
    {
      id: guild.id, // @everyone role
      deny: [PermissionFlagsBits.ViewChannel], // Deny view permission for everyone
    },
    {
      id: user.id, // The user who opened the ticket
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
    },
    {
      id: client.user.id, // The bot
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  // If a support role is configured, grant them access as well
  if (cfg.support_role_id) {
    permissionOverwrites.push({
      id: cfg.support_role_id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
    });
  }

  // Create the channel
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cfg.category_id,
    permissionOverwrites: permissionOverwrites
  });

  // Save to database
  db.addTicket(channel.id, guild.id, user.id);

  // Create welcome message
  const embed = new EmbedBuilder()
    .setTitle(`Ticket #${ticketNum}`)
    .setDescription(`Hola ${user}, bienvenido a tu ticket.\n\n**Motivo:** ${motivo}\n\nUn miembro del staff te atenderá pronto.`)
    .setColor('#60a5fa')
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('🙋‍♂️ Reclamar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Cerrar Ticket')
        .setStyle(ButtonStyle.Danger)
    );

  await channel.send({ content: `${user}`, embeds: [embed], components: [row] });

  return channel;
}

module.exports = { crearTicket };