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
        "Ayudaste a recolectar los materiales necesarios para el Ritual del Sueño Lúcido. Ganas ${ganancia} por tu parte en el proceso.",
        "Lograste documentar el patrón de parpadeo de una entidad espectral. Recibes ${ganancia} por tu informe para la Corporación.",
        "Rastreaste el origen de un video maldito. El cliente te recompensa con ${ganancia} por tu discreción y hallazgo.",
        "Pasaste tiempo en el 'Hotel del Terror' (Nivel 5). Por hacerle la limpieza al conserje invisible, te paga ${ganancia}",
        "Lograste documentar las huellas de un ser desconocido en el bosque. El gremio de cazadores de monstruos te paga ${ganancia} por la evidencia.",
        "Te dedicaste a escuchar los Ecos en el vacío del servidor. Lograste transcribir un mensaje y recibes ${ganancia} por el informe.",
        "Pasaste la tarde monitoreando transmisiones cifradas en un deep web foro de horror. Encontraste un video valioso y cobras ${ganancia}",
        "Te contrataron para reordenar las moquetas del Nivel 4 ('Oficinas Abandonadas'). El trabajo fue monótono, pero ganaste ${ganancia}",
        "Recuperaste y digitalizaste los archivos perdidos del noticiero local sobre la leyenda del Nahual. Cobras ${ganancia} por el material.",
        "Recuperaste un juguete maldito de una casa abandonada. Por desafiar al Poltergeist, ganas ${ganancia}",
      "Te quedaste inmóvil observando un espejo sin reflejo por 6 horas. La Guardia Nocturna te paga ${ganancia} por tu reporte.",
      "Lograste navegar el Nivel 1 de los Backrooms sin encontrar entidades. El esfuerzo se paga con ${ganancia} en efectivo.",
      "Realizaste el ritual de la Mano Invisible. Tu servicio al ente te recompensa con ${ganancia} y evitas un parpadeo fatal.",
      "Pasaste la noche monitoreando un viejo televisor con nieve. Lograste grabar una silueta y vendes la cinta a un investigador. Recibes ${ganancia}"
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