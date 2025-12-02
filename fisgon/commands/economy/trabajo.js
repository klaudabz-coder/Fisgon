const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database'); // Asegúrate de que la ruta a database sea correcta

// Mapa para controlar el tiempo de espera (Cooldown) en memoria
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajo')
    .setDescription('Trabaja en una profesión aleatoria para ganar monedas'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // --- CONFIGURACIÓN ---
    const tiempoEspera = 60 * 60 * 1000; // 1 hora en milisegundos
    const pagoMinimo = 20;
    const pagoMaximo = 250;

    // Lista de respuestas / trabajos aleatorios
    const listaTrabajos = [
        "Trabajaste como programador junior arreglando bugs",
        "Ayudaste a limpiar el parque de la ciudad",
        "Trabajaste de repartidor de pizzas bajo la lluvia",
        "Hiciste de guardia de seguridad en el centro comercial",
        "Vendiste limonada en la esquina",
        "Trabajaste de moderador de Discord",
        "Ayudaste a una anciana a cruzar la calle",
        "Reparaste el coche de un desconocido",
        "Trabajaste de barista haciendo café",
        "Fuiste asistente en una biblioteca"
    ];
    // ---------------------

    // Verificar Cooldown
    if (cooldowns.has(userId)) {
      const expiracion = cooldowns.get(userId) + tiempoEspera;
      if (Date.now() < expiracion) {
        const tiempoRestante = expiracion - Date.now();
        const minutos = Math.ceil(tiempoRestante / (60 * 1000));
        return interaction.reply({ 
            content: `⏱️ Debes esperar **${minutos} minutos** para volver a trabajar.`, 
            ephemeral: true 
        });
      }
    }

    // Calcular ganancia aleatoria entre min y max
    const ganancia = Math.floor(Math.random() * (pagoMaximo - pagoMinimo + 1)) + pagoMinimo;

    // Seleccionar una frase aleatoria
    const trabajoRealizado = listaTrabajos[Math.floor(Math.random() * listaTrabajos.length)];

    // Guardar en la base de datos
    // Nota: Usamos db.addBalance igual que en tus otros comandos
    db.addBalance(guildId, userId, ganancia);

    // Establecer el cooldown
    cooldowns.set(userId, Date.now());

    // Responder al usuario
    return interaction.reply({ 
        content: `💼 **${interaction.user.username}**, ${trabajoRealizado.toLowerCase()} y ganaste **${ganancia}** monedas.` 
    });
  }
};