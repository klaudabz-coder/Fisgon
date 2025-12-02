const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { itemsGacha, configRareza } = require('../../utils/gachaItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartas-info')
    .setDescription('Muestra las estadísticas completas y habilidades de una carta')
    .addStringOption(option => 
        option.setName('carta')
            .setDescription('Escribe el nombre de la carta')
            .setRequired(true)
            .setAutocomplete(true) // ¡Esto activa las sugerencias!
    ),

  // Esta función maneja las sugerencias mientras escribes
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    // Filtramos las cartas que coinciden con lo que escribes
    const filtered = itemsGacha.filter(item => 
        item.name.toLowerCase().includes(focusedValue)
    );

    // Discord solo permite mostrar 25 opciones máximo
    await interaction.respond(
      filtered.slice(0, 25).map(item => ({ name: item.name, value: item.id }))
    );
  },

  async execute(interaction) {
    const cartaId = interaction.options.getString('carta');

    // Buscamos la carta por ID (que viene del autocompletado) o por nombre
    const carta = itemsGacha.find(c => c.id === cartaId || c.name.toLowerCase() === cartaId.toLowerCase());

    if (!carta) {
        return interaction.reply({ content: '❌ Carta no encontrada.', ephemeral: true });
    }

    const infoRareza = configRareza[carta.rarity];

    // Verificar si la carta tiene stats (por si acaso quedó alguna vieja sin actualizar)
    const stats = carta.stats || { hp: '?', atk: '?', def: '?', spd: '?' };
    const ability = carta.ability || { name: 'Desconocida', desc: 'Sin datos' };

    const embed = new EmbedBuilder()
        .setTitle(`${carta.emoji} ${carta.name}`)
        .setDescription(`**Rareza:** ${infoRareza.label}`)
        .setColor(infoRareza.color)
        .addFields(
            { name: '❤️ Vida (HP)', value: `${stats.hp}`, inline: true },
            { name: '⚔️ Ataque (ATK)', value: `${stats.atk}`, inline: true },
            { name: '🛡️ Defensa (DEF)', value: `${stats.def}`, inline: true },
            { name: '💨 Velocidad (SPD)', value: `${stats.spd}`, inline: true },
            { name: '✨ Habilidad Especial', value: `**${ability.name}**\n*${ability.desc}*`, inline: false }
        );

    if (carta.image) embed.setThumbnail(carta.image);

    await interaction.reply({ embeds: [embed] });
  }
};