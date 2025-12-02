const admin = require('firebase-admin');
const fs = require('fs');

// In-memory caches to provide synchronous reads for the bot.
const caches = {
  economy: new Map(),
  inventory: new Map(),
  shop: new Map(),
  levels: new Map(),
  level_roles: new Map(),
  xp_cooldowns: new Map(),
  infractions: new Map(),
  guild_config: new Map(),
  logs: new Map(),
  ticket_config: new Map(),
  tickets: new Map()
};

let firestore = null;
let enabled = false;

async function init() {
  // Initialize Firebase if credentials are present. Support either
  // GOOGLE_APPLICATION_CREDENTIALS env var (file path) or a JSON string
  // in FIREBASE_SERVICE_ACCOUNT env var.
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const obj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(obj) });
      enabled = true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      enabled = true;
    } else {
      console.warn('⚠️  [DB] No Firebase credentials found. Running with in-memory cache only.');
      enabled = false;
    }

    if (enabled) {
      firestore = admin.firestore();
      console.log('ℹ️  [DB] Firebase initialized. Loading caches...');
      await Promise.all([
        loadCollectionToCache('economy', caches.economy, keyFromDocEconomy),
        loadCollectionToCache('inventory', caches.inventory, keyFromDocInventory),
        loadCollectionToCache('shop', caches.shop, doc => doc.id),
        loadCollectionToCache('levels', caches.levels, keyFromDocEconomy),
        loadCollectionToCache('level_roles', caches.level_roles, doc => doc.id),
        loadCollectionToCache('xp_cooldowns', caches.xp_cooldowns, keyFromDocEconomy),
        loadCollectionToCache('infractions', caches.infractions, doc => doc.id),
        loadCollectionToCache('guild_config', caches.guild_config, doc => doc.id),
        loadCollectionToCache('logs', caches.logs, doc => doc.id),
        loadCollectionToCache('ticket_config', caches.ticket_config, doc => doc.id),
        loadCollectionToCache('tickets', caches.tickets, doc => doc.id)
      ]);
      console.log('ℹ️  [DB] Caches loaded.');
    }
  } catch (err) {
    console.error('❌ [DB] Error initializing Firebase:', err);
    enabled = false;
  }
}

async function loadCollectionToCache(collectionName, map, idFn) {
  try {
    const snapshot = await firestore.collection(collectionName).get();
    snapshot.forEach(doc => {
      map.set(idFn(doc), doc.data());
    });
  } catch (err) {
    console.warn(`⚠️  [DB] Could not load collection ${collectionName}:`, err.message || err);
  }
}

function keyFromDocEconomy(doc) {
  const d = doc.data();
  return `${d.guild_id}_${d.user_id}`;
}

function keyFromDocInventory(doc) {
  const d = doc.data();
  return `${d.guild_id}_${d.user_id}_${d.item_id}`;
}

async function persistDoc(collection, id, data) {
  if (!enabled) return;
  try {
    await firestore.collection(collection).doc(id).set(data, { merge: true });
  } catch (err) {
    console.error(`❌ [DB] Failed to persist ${collection}/${id}:`, err.message || err);
  }
}

async function deleteDoc(collection, id) {
  if (!enabled) return;
  try { await firestore.collection(collection).doc(id).delete(); } catch (err) { console.error(`❌ [DB] Failed to delete ${collection}/${id}:`, err.message || err); }
}

// Exported API: keep same function names used across the bot. Reads are synchronous
// against the in-memory cache; writes update cache immediately and persist
// asynchronously (fire-and-forget style with error logging).
module.exports = {
  init,

  // Economy
  getBalance(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const r = caches.economy.get(key);
    return r ? r.balance || 0 : 0;
  },
  addBalance(guildId, userId, amount) {
    const key = `${guildId}_${userId}`;
    const cur = caches.economy.get(key) || { user_id: userId, guild_id: guildId, balance: 0, last_daily: 0 };
    cur.balance = (cur.balance || 0) + amount;
    if (cur.balance < 0) cur.balance = 0;
    caches.economy.set(key, cur);
    persistDoc('economy', key, cur);
    return cur.balance;
  },
  setBalance(guildId, userId, amount) {
    const key = `${guildId}_${userId}`;
    const cur = caches.economy.get(key) || { user_id: userId, guild_id: guildId };
    cur.balance = amount;
    caches.economy.set(key, cur);
    persistDoc('economy', key, cur);
    return cur.balance;
  },
  getLastDaily(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const r = caches.economy.get(key);
    return r ? r.last_daily || 0 : 0;
  },
  setLastDaily(guildId, userId, ts) {
    const key = `${guildId}_${userId}`;
    const cur = caches.economy.get(key) || { user_id: userId, guild_id: guildId, balance: 0 };
    cur.last_daily = ts;
    caches.economy.set(key, cur);
    persistDoc('economy', key, cur);
  },

  // Shop
  listShop(guildId) {
    const out = [];
    for (const v of caches.shop.values()) if (v.guild_id === guildId) out.push(v);
    return out;
  },
  addShopItem(guildId, itemId, nombre, descripcion, precio) {
    const id = `${guildId}_${itemId}`;
    const obj = { guild_id: guildId, item_id: itemId, nombre, descripcion, precio };
    caches.shop.set(id, obj);
    persistDoc('shop', id, obj);
    return obj;
  },
  getShopItem(guildId, itemId) {
    return caches.shop.get(`${guildId}_${itemId}`) || null;
  },
  removeShopItem(guildId, itemId) {
    const id = `${guildId}_${itemId}`;
    caches.shop.delete(id);
    deleteDoc('shop', id);
  },

  // Inventory
  addToInventory(guildId, userId, itemId, cantidad = 1) {
    const key = `${guildId}_${userId}_${itemId}`;
    const cur = caches.inventory.get(key) || { guild_id: guildId, user_id: userId, item_id: itemId, cantidad: 0 };
    cur.cantidad = (cur.cantidad || 0) + cantidad;
    caches.inventory.set(key, cur);
    persistDoc('inventory', key, cur);
  },
  removeFromInventory(guildId, userId, itemId, cantidad = 1) {
    const key = `${guildId}_${userId}_${itemId}`;
    const cur = caches.inventory.get(key);
    if (!cur) return false;
    const nueva = (cur.cantidad || 0) - cantidad;
    if (nueva > 0) {
      cur.cantidad = nueva;
      caches.inventory.set(key, cur);
      persistDoc('inventory', key, cur);
    } else {
      caches.inventory.delete(key);
      deleteDoc('inventory', key);
    }
    return true;
  },
  getInventory(guildId, userId) {
    const out = [];
    for (const v of caches.inventory.values()) if (v.guild_id === guildId && v.user_id === userId) out.push(v);
    return out;
  },

  // Levels
  addXp(guildId, userId, xp) {
    const key = `${guildId}_${userId}`;
    const cur = caches.levels.get(key) || { user_id: userId, guild_id: guildId, xp: 0, level: 0 };
    cur.xp = (cur.xp || 0) + xp;
    caches.levels.set(key, cur);
    persistDoc('levels', key, cur);
    return { xp: cur.xp, level: cur.level };
  },
  getLevel(guildId, userId) {
    return caches.levels.get(`${guildId}_${userId}`) || { xp: 0, level: 0 };
  },
  setLevel(guildId, userId, level) {
    const key = `${guildId}_${userId}`;
    const cur = caches.levels.get(key) || { user_id: userId, guild_id: guildId, xp: 0 };
    cur.level = level;
    caches.levels.set(key, cur);
    persistDoc('levels', key, cur);
  },

  // Level roles
  setLevelRole(guildId, level, roleId) {
    const id = `${guildId}_${level}`;
    const obj = { guild_id: guildId, level, role_id: roleId };
    caches.level_roles.set(id, obj);
    persistDoc('level_roles', id, obj);
    return obj;
  },
  getLevelRole(guildId, level) {
    return caches.level_roles.get(`${guildId}_${level}`) || null;
  },
  listLevelRoles(guildId) {
    const out = [];
    for (const v of caches.level_roles.values()) if (v.guild_id === guildId) out.push({ level: v.level, role_id: v.role_id });
    out.sort((a, b) => a.level - b.level);
    return out;
  },
  removeLevelRole(guildId, level) {
    const id = `${guildId}_${level}`;
    caches.level_roles.delete(id);
    deleteDoc('level_roles', id);
  },

  // XP cooldowns
  getLastXpTime(guildId, userId) {
    const r = caches.xp_cooldowns.get(`${guildId}_${userId}`);
    return r ? r.last_xp || 0 : 0;
  },
  setLastXpTime(guildId, userId, ts) {
    const key = `${guildId}_${userId}`;
    const cur = caches.xp_cooldowns.get(key) || { user_id: userId, guild_id: guildId, last_xp: 0 };
    cur.last_xp = ts;
    caches.xp_cooldowns.set(key, cur);
    persistDoc('xp_cooldowns', key, cur);
  },

  // Infractions
  addInfraction(guildId, userId, moderatorId, reason, type) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const obj = { id, user_id: userId, guild_id: guildId, moderator_id: moderatorId, reason, type, created_at: Date.now() };
    caches.infractions.set(id, obj);
    persistDoc('infractions', id, obj);
    return obj;
  },
  getInfractions(guildId, userId) {
    const out = [];
    for (const v of caches.infractions.values()) if (v.guild_id === guildId && v.user_id === userId) out.push(v);
    return out;
  },

  // Guild config
  setLogChannel(guildId, channelId) {
    const obj = { guild_id: guildId, log_channel_id: channelId };
    caches.guild_config.set(guildId, obj);
    persistDoc('guild_config', guildId, obj);
  },
  getLogChannel(guildId) {
    const r = caches.guild_config.get(guildId);
    return r ? r.log_channel_id : null;
  },

  // Logs
  addLog(guildId, tipo, contenido) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const obj = { id, guild_id: guildId, tipo, contenido, created_at: Date.now() };
    caches.logs.set(id, obj);
    persistDoc('logs', id, obj);
  },

  // Ticket config & tickets
  setTicketConfig(guildId, categoryId, supportRoleId, transcriptChannelId = null) {
    const obj = { guild_id: guildId, category_id: categoryId, support_role_id: supportRoleId, transcript_channel_id: transcriptChannelId, ticket_count: 0 };
    caches.ticket_config.set(guildId, obj);
    persistDoc('ticket_config', guildId, obj);
  },
  getTicketConfig(guildId) {
    return caches.ticket_config.get(guildId) || null;
  },
  incrementTicketCount(guildId) {
    const cur = caches.ticket_config.get(guildId) || { guild_id: guildId, ticket_count: 0 };
    cur.ticket_count = (cur.ticket_count || 0) + 1;
    caches.ticket_config.set(guildId, cur);
    persistDoc('ticket_config', guildId, cur);
    return cur.ticket_count;
  },
  addTicket(channelId, guildId, ownerId) {
    const obj = { channel_id: channelId, guild_id: guildId, owner_id: ownerId, created_at: Date.now(), status: 'open' };
    caches.tickets.set(channelId, obj);
    persistDoc('tickets', channelId, obj);
    return obj;
  },
  closeTicket(channelId) {
    const cur = caches.tickets.get(channelId);
    if (!cur) return null;
    cur.status = 'closed';
    caches.tickets.set(channelId, cur);
    persistDoc('tickets', channelId, cur);
    return cur;
  },
  getTicketByChannel(channelId) {
    return caches.tickets.get(channelId) || null;
  }
};
