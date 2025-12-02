const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

// Importamos el sistema de misiones de forma segura (si existe)
let trackQuest, QUEST_TYPES;
try {
    const quests = require('../../utils/quests');
    trackQuest = quests.trackQuest;
    QUEST_TYPES = quests.QUEST_TYPES;
} catch (e) {
    // Si no tienes el sistema de misiones aún, esto evita errores
}

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
    const tiempoEspera = 60 * 60 * 1000; // 1 hora
    const pagoMinimo = 20;
    const pagoMaximo = 250;

    // Tu lista de trabajos original
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

    // 1. Calcular ganancia
    const ganancia = Math.floor(Math.random() * (pagoMaximo - pagoMinimo + 1)) + pagoMinimo;

    // 2. Seleccionar frase
    let textoTrabajo = listaTrabajos[Math.floor(Math.random() * listaTrabajos.length)];

    // 3. REEMPLAZAR EL TEXTO ${ganancia} POR EL NÚMERO
    textoTrabajo = textoTrabajo.replace('${ganancia}', `**${ganancia}**`); 

    // Guardar en DB
    db.addBalance(guildId, userId, ganancia);

    // Tracking de Misión (si aplica)
    if (trackQuest && QUEST_TYPES) {
        trackQuest(guildId, userId, QUEST_TYPES.WORK, 1);
    }

    // Establecer cooldown
    cooldowns.set(userId, Date.now());

    // Responder
    // Convertimos la primera letra a minúscula para que encaje después del nombre de usuario
    // ej: "**Usuario**, lograste documentar..."
    const textoFinal = textoTrabajo.charAt(0).toLowerCase() + textoTrabajo.slice(1);

    return interaction.reply({ 
        content: `💼 **${interaction.user.username}**, ${textoFinal}` 
    });
  }
};