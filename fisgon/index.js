const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

// Importar el monitor de redes sociales
const { startSocialCheck } = require('./utils/socialCheck');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('Falta DISCORD_TOKEN o CLIENT_ID en .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();

// Cargar comandos recursivamente
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) loadCommands(full);
    else if (entry.name.endsWith('.js')) {
      const cmd = require(full);
      if (cmd && cmd.data && cmd.execute) {
        client.commands.set(cmd.data.name, cmd);
      }
    }
  }
}
loadCommands(commandsPath);

// Cargar eventos
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event && event.name) {
      if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
      else client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

// Inicializar DB (exports helpers)
client.db = require('./database');

// Registrar comandos al iniciar
client.once('ready', async () => {
  console.log(`Conectado como ${client.user.tag} — cargados ${client.commands.size} comandos.`);
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord.js');
  const restClient = new REST({ version: '10' }).setToken(token);

  const comandos = [];
  for (const cmd of client.commands.values()) comandos.push(cmd.data.toJSON());

  try {
    if (guildId) {
      // 1. Registrar comandos SOLO en tu servidor (actualización instantánea)
      await restClient.put(Routes.applicationGuildCommands(clientId, guildId), { body: comandos });
      console.log(`✅ Comandos registrados LOCALMENTE en el servidor: ${guildId}`);

      // 2. BORRAR los comandos globales antiguos para quitar los duplicados
      // Esto soluciona que te salgan las opciones repetidas
      await restClient.put(Routes.applicationCommands(clientId), { body: [] });
      console.log('🗑️ Comandos globales antiguos eliminados (duplicados resueltos).');

    } else {
      // Si NO hay ID de servidor, registramos globalmente
      await restClient.put(Routes.applicationCommands(clientId), { body: comandos });
      console.log('🌎 Comandos registrados GLOBALMENTE (puede tardar 1 hora en actualizarse).');
    }
  } catch (err) {
    console.error('Error registrando comandos:', err);
  }

  // Iniciar monitor de redes sociales
  startSocialCheck(client);
});

client.on('interactionCreate', async interaction => {
  // Delegado: tenemos un evento interactionCreate en events/interactionCreate.js que maneja botones y comandos.
});

(async () => {
  try {
    if (client.db && typeof client.db.init === 'function') await client.db.init();
  } catch (err) {
    console.error('Error iniciando la base de datos:', err);
  }
  client.login(token);
})();