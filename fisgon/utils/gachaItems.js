// Lista de personajes/items disponibles en el Gacha
// Probabilidad sugerida (Total 100%):
// Común: 60%, Raro: 30%, Épico: 9%, Legendario: 1%

const itemsGacha = [
    // --- LEGENDARIOS ---
    { id: 'g_dragon', name: 'Dragón Dorado', rarity: 'Legendary', emoji: '🐉', image: 'https://i.imgur.com/EjemploDragon.png' },
    { id: 'g_angel', name: 'Arcángel', rarity: 'Legendary', emoji: '👼', image: 'https://i.imgur.com/EjemploAngel.png' },

    // --- ÉPICOS ---
    { id: 'g_caballero', name: 'Caballero Oscuro', rarity: 'Epic', emoji: '🛡️', image: '' },
    { id: 'g_mago', name: 'Mago Supremo', rarity: 'Epic', emoji: '🔮', image: '' },
    { id: 'g_unicornio', name: 'Unicornio', rarity: 'Epic', emoji: '🦄', image: '' },

    // --- RAROS ---
    { id: 'g_ninja', name: 'Ninja', rarity: 'Rare', emoji: '🥷', image: '' },
    { id: 'g_robot', name: 'Androide', rarity: 'Rare', emoji: '🤖', image: '' },
    { id: 'g_fantasma', name: 'Fantasma', rarity: 'Rare', emoji: '👻', image: '' },
    { id: 'g_alien', name: 'Alien', rarity: 'Rare', emoji: '👽', image: '' },

    // --- COMUNES ---
    { id: 'g_slime', name: 'Slime Verde', rarity: 'Common', emoji: '🟢', image: '' },
    { id: 'g_roca', name: 'Roca Mascota', rarity: 'Common', emoji: '🪨', image: '' },
    { id: 'g_raton', name: 'Ratón de Campo', rarity: 'Common', emoji: '🐭', image: '' },
    { id: 'g_gato', name: 'Gato Callejero', rarity: 'Common', emoji: '🐱', image: '' },
    { id: 'g_pato', name: 'Pato de Hule', rarity: 'Common', emoji: '🦆', image: '' },
];

// Configuración de rarezas y colores
const configRareza = {
    'Legendary': { chance: 1, color: '#FFD700', label: 'LEGENDARIO' }, // 1%
    'Epic':      { chance: 10, color: '#9932CC', label: 'ÉPICO' },      // 9% (acumulado hasta 10)
    'Rare':      { chance: 40, color: '#1E90FF', label: 'RARO' },       // 30% (acumulado hasta 40)
    'Common':    { chance: 100, color: '#808080', label: 'COMÚN' }     // 60% (resto)
};

module.exports = { itemsGacha, configRareza };