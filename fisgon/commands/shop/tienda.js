const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  ComponentType 
} = require('discord.js');
const db = require('../../database');

const ITEMS_POR_PAGINA = 5;

module.exports = {
data: new SlashCommandBuilder()
  .setName('tienda')
  .setDescription('Muestra la tienda con interfaz interactiva para comprar'),

async execute(interaction) {
  const items = db.listShop(interaction.guild.id);

  // 1. Validar si hay items
  if (!items || items.length === 0) {
      return interaction.reply({ content: '🏪 La tienda está vacía por el momento.', ephemeral: true });
  }

  let paginaActual = 0;
  const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);

  // --- Función para generar el Embed (La parte visual) ---
  const generarEmbed = (pagina) => {
      const inicio = pagina * ITEMS_POR_PAGINA;
      const fin = inicio + ITEMS_POR_PAGINA;
      const itemsPagina = items.slice(inicio, fin);

      const embed = new EmbedBuilder()
          .setTitle('🏪 Tienda del Servidor')
          .setDescription('Selecciona un artículo en el menú de abajo para comprarlo instantáneamente.\nPara más detalles usa `/tienda-info` (si existe).')
          .setColor('#2f3136') // Color oscuro estilo Discord
          .setFooter({ text: `Página ${pagina + 1}/${totalPaginas}` });

      // Añadimos los campos simulando el diseño de la imagen
      itemsPagina.forEach(item => {
          // Usamos emojis para simular el botón verde de precio
          embed.addFields({ 
              name: `${item.nombre}`, 
              value: `📝 ${item.descripcion}\n💸 **Precio:** \` 💎 ${item.precio} \``, 
              inline: false 
          });
      });

      return embed;
  };

  // --- Función para generar los Componentes (Menú y Botones) ---
  const generarComponentes = (pagina) => {
      const inicio = pagina * ITEMS_POR_PAGINA;
      const fin = inicio + ITEMS_POR_PAGINA;
      const itemsPagina = items.slice(inicio, fin);

      // 1. Menú desplegable para comprar
      const menuCompra = new StringSelectMenuBuilder()
          .setCustomId('comprar_item')
          .setPlaceholder('🛒 Selecciona un artículo para comprar...')
          .addOptions(
              itemsPagina.map(item => 
                  new StringSelectMenuOptionBuilder()
                      .setLabel(item.nombre)
                      .setDescription(`Cuesta ${item.precio} monedas`)
                      .setValue(item.item_id)
                      .setEmoji('💎')
              )
          );

      const filaMenu = new ActionRowBuilder().addComponents(menuCompra);

      // 2. Botones de paginación
      const botonAtras = new ButtonBuilder()
          .setCustomId('atras')
          .setLabel('Página Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pagina === 0);

      const botonSiguiente = new ButtonBuilder()
          .setCustomId('siguiente')
          .setLabel('Siguiente Página')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pagina === totalPaginas - 1);

      const filaBotones = new ActionRowBuilder().addComponents(botonAtras, botonSiguiente);

      return [filaMenu, filaBotones];
  };

  // --- Enviar mensaje inicial ---
  const mensaje = await interaction.reply({ 
      embeds: [generarEmbed(paginaActual)], 
      components: generarComponentes(paginaActual),
      fetchReply: true 
  });

  // --- Crear Colector de Interacciones ---
  // Solo la persona que usó el comando puede interactuar durante 5 minutos
  const collector = mensaje.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id, 
      time: 300000 
  });

  collector.on('collect', async i => {
      // A) Lógica de Paginación
      if (i.customId === 'atras') {
          paginaActual--;
          await i.update({ 
              embeds: [generarEmbed(paginaActual)], 
              components: generarComponentes(paginaActual) 
          });
      } 
      else if (i.customId === 'siguiente') {
          paginaActual++;
          await i.update({ 
              embeds: [generarEmbed(paginaActual)], 
              components: generarComponentes(paginaActual) 
          });
      }

      // B) Lógica de Compra
      else if (i.customId === 'comprar_item') {
          const itemId = i.values[0]; // El valor seleccionado en el menú
          const item = db.getShopItem(interaction.guild.id, itemId);

          if (!item) {
              return i.reply({ content: '❌ Este artículo ya no existe.', ephemeral: true });
          }

          const balance = db.getBalance(interaction.guild.id, interaction.user.id);

          if (balance < item.precio) {
              return i.reply({ content: `❌ No tienes suficiente saldo. Tienes **${balance}** y necesitas **${item.precio}**.`, ephemeral: true });
          }

          // Procesar compra
          db.addBalance(interaction.guild.id, interaction.user.id, -item.precio);
          db.addToInventory(interaction.guild.id, interaction.user.id, itemId, 1);

          return i.reply({ content: `✅ **¡Compra exitosa!** Has comprado **${item.nombre}** por ${item.precio} monedas.`, ephemeral: true });
      }
  });

  collector.on('end', () => {
      // Desactivar botones cuando termine el tiempo
      const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('expired').setLabel('Sesión expirada').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}
};