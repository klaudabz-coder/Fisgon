const db = require('../database');
const { crearTicket } = require('../utils/tickets');
const { generarTranscripcion } = require('../utils/transcript');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {

    // 1. MANEJO DE AUTOCOMPLETADO
    if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.autocomplete(interaction);
      } catch (err) {
        console.error('Error en autocompletado:', err);
      }
      return;
    }

    // 2. COMANDOS SLASH (AQUÍ ESTÁ LA LÓGICA DE BLOQUEO)
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;

      // --- VERIFICACIÓN DE MÓDULOS ---
      if (cmd.category && interaction.guild) {
        const config = db.getCategoryConfig(interaction.guild.id, cmd.category);

        // A) Verificar si está desactivado
        if (config.enabled === false) {
             return interaction.reply({ content: `🚫 El sistema de **${cmd.category}** está desactivado en este servidor.`, ephemeral: true });
        }

        // B) Verificar Roles (Los administradores siempre pasan)
        if (config.required_role && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            if (!interaction.member.roles.cache.has(config.required_role)) {
                return interaction.reply({ content: `🔒 Necesitas el rol <@&${config.required_role}> para usar comandos de **${cmd.category}**.`, ephemeral: true });
            }
        }
      }
      // -------------------------------

      try {
        await cmd.execute(interaction, client);
      } catch (err) {
        console.error('Error ejecutando comando:', err);
        if (!interaction.replied) await interaction.reply({ content: 'Error al ejecutar el comando.', ephemeral: true });
      }
      return;
    }

    // 3. BOTONES (Tickets, etc.) - Se mantiene igual
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

        await interaction.deferReply(); 
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
            if (targetCh && targetCh.isTextBased() && targetCh.send) {
              const buffer = Buffer.from(transcriptText, 'utf-8');
              const filename = `transcript-${channel.name}-${Date.now()}.txt`;
              const attachment = new AttachmentBuilder(buffer, { name: filename });
              const meta = `Transcripción del ticket **${channel.name}**\nServidor: **${guild.name}**\nTicket owner: <@${ticket.owner_id}>\nCerrado por: ${interaction.user.tag}\n`;
              await targetCh.send({ content: meta, files: [attachment] }).catch(e => {
                console.error('No se pudo enviar la transcripción:', e);
              });
            }
          }

          db.closeTicket(channel.id);
          try { await channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: false, SendMessages: false }).catch(()=>{}); } catch (e) {}

          await interaction.editReply({ content: '🔒 **Ticket cerrado.** Transcripción guardada. El canal se eliminará en **5 segundos**.' });

          setTimeout(async () => {
            try { await channel.delete('Ticket cerrado — limpieza automática').catch(()=>{}); } catch(e){}
          }, 5000);

          return;
        } catch (err) {
          console.error('Error al cerrar ticket:', err);
          return interaction.editReply({ content: `Error al cerrar el ticket: ${err.message}`, ephemeral: true });
        }
      }
    }
  }
};