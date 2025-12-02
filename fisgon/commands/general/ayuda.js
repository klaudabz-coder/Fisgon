const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra todos los comandos disponibles organizados por categoría'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 Centro de Ayuda de Fisgón')
      .setDescription('Aquí tienes la lista de comandos disponibles. Escribe `/` para ver las sugerencias de autocompletado.')
      .setColor('#0099ff') // Puedes cambiar este color hexadecimal
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '💰 Economía',
          value: '`/saldo` - Ver tu dinero\n`/reclamar-diario` - Recompensa diaria\n`/trabajo` - Ganar dinero trabajando\n`/mendigar` - Pedir una limosna\n`/pagar` - Transferir dinero a otro usuario',
          inline: false
        },
        {
          name: '🎮 Juegos y Gacha',
          value: '`/blackjack` - Jugar al 21\n`/ruleta` - Apostar a un color\n`/tragamonedas` - Máquina de azar\n`/gacha-tirar` - Invocar personajes\n`/gacha-coleccion` - Ver tus personajes',
          inline: false
        },
        {
          name: '🛒 Tienda y Niveles',
          value: '`/tienda` - Ver artículos en venta\n`/comprar` - Comprar un artículo\n`/perfil-nivel` - Ver tu nivel y XP\n`/top-niveles` - Ranking del servidor',
          inline: false
        },
        {
          name: '👮 Moderación (Staff)',
          value: '`/advertir` - Poner un warn\n`/silenciar` - Mute temporal (Timeout)\n`/expulsar` - Kickear usuario\n`/banear` - Banear usuario\n`/infractores` - Ver historial de sanciones',
          inline: false
        },
        {
          name: '⚙️ Configuración y Admin',
          value: '`/tickets-panel` - Enviar panel de tickets\n`/tickets-configurar` - Ajustar sistema de tickets\n`/alerta-social` - Configurar avisos de TikTok/IG\n`/configurar-logs` - Canal de registros\n`/tienda-agregar` - Añadir items a la tienda\n`/nivel-recompensa-fijar` - Dar roles por nivel',
          inline: false
        }
      )
      .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};