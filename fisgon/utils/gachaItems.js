// utils/gachaItems.js

// Definimos las estadísticas base
const itemsGacha = [
    // --- LEGENDARIOS (Stats muy altos) ---
    { 
        id: 'g_dragon', name: 'Dragón Dorado', rarity: 'Legendary', emoji: '🐉', 
        image: 'https://i.imgur.com/EjemploDragon.png',
        stats: { hp: 300, atk: 60, def: 30, spd: 20 },
        ability: { name: 'Aliento de Fuego', desc: 'Daña masivamente ignorando defensa', type: 'pierce' }
    },
    { 
        id: 'g_angel', name: 'Arcángel', rarity: 'Legendary', emoji: '👼', 
        image: 'https://i.imgur.com/EjemploAngel.png',
        stats: { hp: 350, atk: 45, def: 40, spd: 25 },
        ability: { name: 'Juicio Final', desc: 'Golpe crítico asegurado', type: 'crit' }
    },

    // --- ÉPICOS (Stats equilibrados) ---
    { 
        id: 'g_caballero', name: 'Caballero Oscuro', rarity: 'Epic', emoji: '🛡️', image: '',
        stats: { hp: 250, atk: 40, def: 35, spd: 10 },
        ability: { name: 'Escudo de Sombras', desc: 'Aumenta su defensa drásticamente', type: 'buff_def' }
    },
    { 
        id: 'g_mago', name: 'Mago Supremo', rarity: 'Epic', emoji: '🔮', image: '',
        stats: { hp: 180, atk: 55, def: 15, spd: 30 },
        ability: { name: 'Explosión Arcana', desc: 'Alto daño mágico', type: 'magic' }
    },
    { 
        id: 'g_unicornio', name: 'Unicornio', rarity: 'Epic', emoji: '🦄', image: '',
        stats: { hp: 220, atk: 35, def: 20, spd: 40 },
        ability: { name: 'Cuerno de Luz', desc: 'Se cura a sí mismo', type: 'heal' }
    },

    // --- RAROS ---
    { 
        id: 'g_ninja', name: 'Ninja', rarity: 'Rare', emoji: '🥷', image: '',
        stats: { hp: 160, atk: 40, def: 10, spd: 50 },
        ability: { name: 'Shuriken', desc: 'Ataque rápido', type: 'dmg' }
    },
    { 
        id: 'g_robot', name: 'Androide', rarity: 'Rare', emoji: '🤖', image: '',
        stats: { hp: 200, atk: 30, def: 30, spd: 5 },
        ability: { name: 'Rayo Láser', desc: 'Ataque concentrado', type: 'dmg' }
    },

    // --- COMUNES (Stats básicos) ---
    { 
        id: 'g_slime', name: 'Slime Verde', rarity: 'Common', emoji: '🟢', image: '',
        stats: { hp: 120, atk: 15, def: 5, spd: 5 },
        ability: { name: 'Golpe Pegajoso', desc: 'Pequeño daño extra', type: 'dmg' }
    },
    { 
        id: 'g_roca', name: 'Roca Mascota', rarity: 'Common', emoji: '🪨', image: '',
        stats: { hp: 150, atk: 10, def: 25, spd: 1 },
        ability: { name: 'Endurecer', desc: 'Sube un poco la defensa', type: 'buff_def' }
    },
    { 
        id: 'g_gato', name: 'Gato Callejero', rarity: 'Common', emoji: '🐱', image: '',
        stats: { hp: 100, atk: 20, def: 5, spd: 30 },
        ability: { name: 'Arañazo', desc: 'Daño rápido', type: 'dmg' }
    }
];

const configRareza = {
    'Legendary': { chance: 1, color: '#FFD700', label: 'LEGENDARIO' },
    'Epic':      { chance: 10, color: '#9932CC', label: 'ÉPICO' },
    'Rare':      { chance: 40, color: '#1E90FF', label: 'RARO' },
    'Common':    { chance: 100, color: '#808080', label: 'COMÚN' }
};

module.exports = { itemsGacha, configRareza };