```markdown
# Bot Discord en Español - Repositorio

Este repositorio contiene un bot de Discord en español con:
- Economía (saldo, diario, pagar, mendigar)
- Tienda por servidor
- Moderación (kick, ban, mute, warns)
- Logging básico configurable
- Sistema de niveles con asignación automática de roles al subir de nivel
- Barra de progreso visual y generación de imagen PNG (node-canvas)
- Cooldown de XP: 2 minutos; XP por mensaje aleatorio entre 10 y 20
- Sistema de tickets con transcripción automática al cerrar
- Juegos: blackjack, ruleta, tragamonedas

Requisitos
- Node.js >= 18
- Dependencias del sistema para canvas (en Linux):
  - Ubuntu/Debian: `sudo apt-get install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
  - En otros sistemas puede variar; revisa la documentación de node-canvas.

Instalación
1. Clona o copia este repositorio en tu máquina.
2. `npm install`
3. Copia `.env.example` a `.env` y rellena:
   - DISCORD_TOKEN
   - CLIENT_ID
   - Opcional: GUILD_ID para registrar comandos sólo en ese servidor (desarrollo)
4. Crea la carpeta `data/` en la raíz si no existe (la DB se creará automáticamente).

Ejecución
- `npm start` para ejecutar.
- `npm run dev` (si instalaste nodemon) para desarrollo.

Permisos recomendados para el bot
- Send Messages, Manage Channels (para tickets), Manage Roles (para asignar/quitar roles), Embed Links, Attach Files, Read Message History, View Channels.

Primeros pasos dentro de Discord
1. Usa `/tickets-configurar` para configurar categoría, rol de soporte y canal de transcripciones.
2. Usa `/tickets-panel` para enviar el panel con botón de abrir ticket.
3. Usa `/nivel-recompensa-fijar` para asignar roles automáticos por nivel.
4. Ajusta canal de logs con `/configurar-logs` para ver notificaciones de niveles y moderación.

Notas
- Asegúrate de que el rol del bot esté por encima de los roles que debe asignar/quitar.
- Si canvas falla en la instalación, instala las dependencias nativas del SO (ver arriba) o dímelo y te doy instrucciones específicas.
- Puedes personalizar XP range y cooldown modificando constants en `events/messageCreate.js`.

Mejoras posibles
- Panel de configuración en web o comandos adicionales para personalizar colores/plantillas de la imagen.
- Persistencia remota (Postgres) o backup de transcripciones a S3/Google Drive.
- Cooldowns por canal o por tipo de mensaje.

Si quieres, puedo:
- Crear el repositorio en tu cuenta de GitHub (necesito acceso/token).
- Añadir un Dockerfile y workflow de GitHub Actions para deploy.
- Migrar a TypeScript.
- Añadir tests unitarios para las funciones críticas.

```