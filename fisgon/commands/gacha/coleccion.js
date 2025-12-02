const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('album')
    .setDescription('Muestra tu álbum de cartas coleccionables')
    .addUserOption(u => u.setName('usuario').setDescription('Ver colección de otro usuario')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;

    // Obtener inventario crudo de la base de datos
    const inventarioRaw = db.getInventory(interaction.guild.id, target.id);

    if (!inventarioRaw || inventarioRaw.length === 0) {
        return interaction.reply({ content: `${target.username} no tiene ítems en su inventario.`, ephemeral: true });
    }

    // Filtrar y enriquecer los datos (cruzar IDs de la DB con la lista itemsGacha)
    const miColeccion = [];

    for (const slot of inventarioRaw) {
        // Buscamos si el ID del inventario existe en nuestra lista de Gacha
        const itemInfo = itemsGacha.find(i => i.id === slot.item_id);
        if (itemInfo) {
            miColeccion.push({
                ...itemInfo,
                cantidad: slot.cantidad
            });
        }
    }

    if (miColeccion.length === 0) {
        return interaction.reply({ content: `${target.username} tiene ítems, pero ninguno es de Gacha.`, ephemeral: true });
    }

    // Ordenar por rareza
    const orden = { 'Legendary': 0, 'Epic': 1, 'Rare': 2, 'Common': 3 };
    miColeccion.sort((a, b) => orden[a.rarity] - orden[b.rarity]);

    // Construir el texto
    let descripcion = '';
    let totalItems = 0;

    // Agrupar por rareza para mostrar bonito
    ['Legendary', 'Epic', 'Rare', 'Common'].forEach(rareza => {
        const itemsDeRareza = miColeccion.filter(i => i.rarity === rareza);
        if (itemsDeRareza.length > 0) {
            const info = configRareza[rareza];
            descripcion += `\n**--- ${info.label} ---**\n`;
            itemsDeRareza.forEach(item => {
                descripcion += `${item.emoji} **${item.name}** x${item.cantidad}\n`;
                totalItems += item.cantidad;
            });
        }
    });

    const embed = new EmbedBuilder()
        .setTitle('📖 Álbum de Cartas de ${target.username}')
        .setDescription(descripcion || 'Nada por aquí.')
        .setColor('#60a5fa')
        .setFooter({ text: `Total de personajes: ${totalItems} | ${miColeccion.length}/${itemsGacha.length} descubiertos` });

    return interaction.reply({ embeds: [embed] });
  }
};