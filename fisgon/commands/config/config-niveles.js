const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { xpForLevel } = require('../../utils/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-niveles')
    .setDescription('Ajusta la dificultad para subir de nivel')
    .addIntegerOption(o => o.setName('base').setDescription('XP necesaria para el nivel 1 (Default: 100)').setRequired(true))
    .addNumberOption(o => o.setName('dificultad').setDescription('Multiplicador exponencial (Default: 1.5). Más alto = Más difícil.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const base = interaction.options.getInteger('base');
    const exponent = interaction.options.getNumber('dificultad');

    if (base < 10) return interaction.reply({ content: 'La base debe ser al menos 10.', ephemeral: true });
    if (exponent < 1 || exponent > 5) return interaction.reply({ content: 'La dificultad debe estar entre 1.0 y 5.0.', ephemeral: true });

    // Guardar
    db.setLevelConfig(interaction.guild.id, base, exponent);

    // Generar ejemplo
    const config = { base, exponent };
    const ejemplo = `
    **Nivel 1:** ${xpForLevel(1, config)} XP
    **Nivel 5:** ${xpForLevel(5, config)} XP
    **Nivel 10:** ${xpForLevel(10, config)} XP
    **Nivel 20:** ${xpForLevel(20, config)} XP
    `;

    const embed = new EmbedBuilder()
        .setTitle('📊 Configuración de Niveles Actualizada')
        .setColor('#00FF00')
        .setDescription(`La nueva fórmula es: \`XP = ${base} * (Nivel ^ ${exponent})\``)
        .addFields({ name: 'Ejemplo de progresión:', value: ejemplo });

    return interaction.reply({ embeds: [embed] });
  }
};