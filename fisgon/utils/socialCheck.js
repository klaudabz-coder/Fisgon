const db = require('../database');
const Parser = require('rss-parser');
const parser = new Parser({
    timeout: 10000, // 10 segundos de espera máxima
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

/**
 * Intenta obtener el último post de una plataforma usando RSSHub.
 * @param {string} platform 'tiktok' o 'instagram'
 * @param {string} username Nombre de usuario sin @
 */
async function checkPlatform(platform, username) {
    let url = '';

    // Definimos las URLs de RSSHub
    // Usamos 'rsshub.app' que es la instancia pública oficial.
    // Si te da errores de límite ("Rate limit"), podrías necesitar usar otra instancia o hostear la tuya.
    if (platform === 'tiktok') {
        url = `https://rsshub.app/tiktok/user/${username}`;
    } else if (platform === 'instagram') {
        // Usamos la ruta de 'picnob' (visor de IG) porque la oficial de IG suele fallar sin cookies
        url = `https://rsshub.app/picnob/user/${username}`;
    } else {
        return null;
    }

    try {
        const feed = await parser.parseURL(url);

        if (!feed || !feed.items || feed.items.length === 0) {
            return null;
        }

        // El primer ítem suele ser el más reciente
        const latest = feed.items[0];

        // Validamos que tenga guid (ID único) y link
        if (!latest.guid && !latest.link) return null;

        // Estandarizamos el objeto de retorno
        return {
            id: latest.guid || latest.link, // Usamos el link como ID si no hay guid
            url: latest.link,
            title: latest.title || 'Nuevo post',
            pubDate: latest.pubDate
        };

    } catch (error) {
        // Es normal que falle a veces si RSSHub está saturado o el usuario no existe
        // console.error(`[SocialCheck] Error leyendo ${platform}/${username}: ${error.message}`);
        return null;
    }
}

async function startSocialCheck(client) {
    // Intervalo: Cada 10 minutos
    const INTERVALO = 10 * 60 * 1000;

    console.log('✅ [Social] Sistema de monitoreo iniciado.');

    // Ejecutar inmediatamente al inicio (opcional, o esperar al primer intervalo)
    // runChecks(client); 

    setInterval(() => runChecks(client), INTERVALO);
}

async function runChecks(client) {
    const feeds = db.getAllSocialFeeds();

    if (!feeds || feeds.length === 0) return;

    console.log(`🔎 [Social] Comprobando ${feeds.length} cuentas...`);

    for (const feed of feeds) {
        // Pequeña pausa de 2 segundos entre peticiones para no saturar RSSHub
        await new Promise(r => setTimeout(r, 2000));

        const data = await checkPlatform(feed.platform, feed.username);

        if (data && data.id) {
            // Si es la primera vez que añadimos la alerta, last_post_id será null.
            // Para evitar notificar un video viejo nada más configurar, guardamos el actual sin avisar
            // O si prefieres avisar siempre, quita la condición de !feed.last_post_id
            if (!feed.last_post_id) {
                db.updateSocialFeedLastPost(feed.id, data.id);
                continue;
            }

            // Si hay un ID nuevo diferente al guardado
            if (data.id !== feed.last_post_id) {
                const channel = await client.channels.fetch(feed.channel_id).catch(() => null);

                if (channel && channel.isTextBased()) {
                    const msg = `🚨 **¡Nuevo post de ${feed.username} en ${feed.platform.toUpperCase()}!**\n${data.url}`;

                    await channel.send(msg).catch(err => console.error('No pude enviar alerta:', err.message));

                    // Actualizar DB
                    db.updateSocialFeedLastPost(feed.id, data.id);
                    console.log(`[Social] Notificación enviada para ${feed.username}`);
                }
            }
        }
    }
}

module.exports = { startSocialCheck };