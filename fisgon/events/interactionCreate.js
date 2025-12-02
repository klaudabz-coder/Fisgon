const db = require('../database');
const { crearTicket } = require('../utils/tickets');
const { generarTranscripcion } = require('../utils/transcript');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // Comandos slash
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.execute(interaction, client);
      } catch (err) {
        console.error('Error ejecutando comando:', err);
        if (!interaction.replied) await interaction.reply({ content: 'Error al ejecutar el comando.', ephemeral: true });
      }
      return;
    }

    // Botones de tickets
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'ticket_create') {
        await interaction.deferReply({ ephemeral: true }).catch(()=>{});
        try {
          const chan = await crearTicket(client, interaction.guild, interaction.user, 'Abierto desde panel');
          return interaction.editReply({ content: `Ticket creado: ${chan}`, ephemeral: true });
        } catch (err) {
          return interaction.editReply({ content: `No se pudo crear el ticket: ${err.message}`, ephemeral: true });
        }
      }

      if (id === 'ticket_claim') {
        const ticket = db.getTicketByChannel(interaction.channelId);
        if (!ticket) return interaction.reply({ content: 'Este canal no es un ticket registrado.', ephemeral: true });
        await interaction.reply({ content: `${interaction.user} ha reclamado este ticket.`, ephemeral: false });
        return;
      }

      if (id === 'ticket_close') {
        const ticket = db.getTicketByChannel(interaction.channelId);
        if (!ticket) return interaction.reply({ content: 'Este canal no es un ticket registrado.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true }).catch(()=>{});
        const channel = interaction.channel;
        const guild = interaction.guild;
        const cfg = db.getTicketConfig(guild.id);

        try {
          let transcriptText = '';
          try {
            transcriptText = await generarTranscripcion(channel);
          } catch (err) {
            console.error('Error generando transcripción:', err);
            transcriptText = `Error generando transcripción: ${err.message}`;
          }

          if (cfg && cfg.transcript_channel_id) {
            const targetCh = await guild.channels.fetch(cfg.transcript_channel_id).catch(()=>null);
            if (targetCh && targetCh.isTextBased && targetCh.send) {
              const buffer = Buffer.from(transcriptText, 'utf-8');
              const filename = `transcript-${channel.name}-${Date.now()}.txt`;
              const attachment = new AttachmentBuilder(buffer, { name: filename });
              const meta = `Transcripción del ticket **${channel.name}**\nServidor: **${guild.name}**\nTicket owner: <@${ticket.owner_id}> (${ticket.owner_id})\nCerrado por: ${interaction.user.tag} (${interaction.user.id})\nCanal origen: <#${channel.id}>\n`;
              await targetCh.send({ content: meta, files: [attachment] }).catch(e => {
                console.error('No se pudo enviar la transcripción al canal de transcripciones:', e);
              });
            } else {
              await interaction.editReply({ content: 'Transcripción generada, pero no se pudo enviar al canal de transcripciones (canal inválido o permisos).', ephemeral: true });
            }
          } else {
            await interaction.editReply({ content: 'Transcripción generada, pero no hay canal de transcripciones configurado (usa /tickets-configurar).', ephemeral: true });
          }

          db.closeTicket(channel.id);

          try {
            await channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: false, SendMessages: false }).catch(()=>{});
          } catch (e) {}

          try {
            if (interaction.message && interaction.message.edit) {
              const msg = interaction.message;
              const row = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder().setCustomId('ticket_claim').setLabel('💼 Reclamar').setStyle(ButtonStyle.Secondary).setDisabled(true),
                  new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Cerrar').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
              await msg.edit({ content: `${msg.content}\n\n🔒 Ticket cerrado por ${interaction.user.tag}`, components: [row] }).catch(()=>{});
            }
          } catch (e) {}

          try {
            await interaction.followUp({ content: 'Ticket cerrado. Se generó la transcripción y se enviará al canal configurado (si existe). El canal será eliminado en 15 segundos.', ephemeral: true });
          } catch(e){}
          setTimeout(async () => {
            try {
              await channel.delete('Ticket cerrado — limpieza automática').catch(()=>{});
            } catch(e){}
          }, 15000);

          return;
        } catch (err) {
          console.error('Error al cerrar ticket con transcripción:', err);
          return interaction.editReply({ content: `Error al cerrar el ticket: ${err.message}`, ephemeral: true });
        }
      }
    }
  }
};