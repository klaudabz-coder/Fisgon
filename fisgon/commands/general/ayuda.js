const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra la lista actualizada de comandos'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Centro de Ayuda de Fisgón')
      .setDescription('Aquí tienes todos los comandos disponibles organizados por categoría.')
      .setColor('#5865F2') // Color Blurple de Discord
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '💰 Economía y Misiones',
          value: [
            '`/saldo` - Ver tu dinero',
            '`/reclamar-diario` - Recompensa diaria (24h)',
            '`/trabajo` - Ganar dinero trabajando',
            '`/misiones` - Ver tus tareas diarias y reclamar premios',
            '`/mendigar` - Pedir limosna (probabilidad)',
            '`/pagar` - Enviar dinero a otro usuario'
          ].join('\n'),
          inline: false
        },
        {
          name: '🃏 Cartas Coleccionables (TCG)',
          value: [
            '`/cartas-abrir` - Comprar y abrir sobres de cartas',
            '`/album` - Ver tu colección de cartas',
            '`/cartas-info` - Ver stats y habilidades de una carta',
            '`/duelo` - Retar a alguien a una batalla de cartas',
            '`/aventura` - Luchar contra NPCs y cargar el Atrapasueños'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎰 Casino y Juegos',
          value: [
            '`/blackjack` - Jugar al 21 contra la casa',
            '`/ruleta` - Apostar a un color (Rojo/Negro/Verde)',
            '`/tragamonedas` - Máquina de azar clásica'
          ].join('\n'),
          inline: false
        },
        {
          name: '🛒 Tienda y Niveles',
          value: [
            '`/tienda` - Ver y comprar artículos',
            '`/perfil` - Ver tu nivel, XP y barra de progreso',
            '`/top-niveles` - Ranking de usuarios con más XP'
          ].join('\n'),
          inline: false
        },
        {
          name: '🛡️ Moderación',
          value: [
            '`/advertir` - Poner un warn a un usuario',
            '`/silenciar` - Mute temporal (Timeout)',
            '`/expulsar` - Expulsar (Kick)',
            '`/banear` - Banear del servidor',
            '`/infractores` - Ver historial de sanciones de alguien'
          ].join('\n'),
          inline: false
        },
        {
          name: '⚙️ Administración y Configuración',
          value: [
            '`/tickets-panel` - Enviar panel de soporte',
            '`/alerta-social` - Configurar avisos de TikTok/Instagram',
            '`/autorol` - Asignar rol automático a nuevos miembros',
            '`/config-modulos` - Activar/Desactivar sistemas o restringirlos',
            '`/config-niveles` - Ajustar la dificultad de XP',
            '`/configurar-logs` - Canal de registros',
            '`/admin-dinero` - (Admin) Dar/Quitar dinero a usuarios'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: `Versión 2.5 | Solicitado por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};