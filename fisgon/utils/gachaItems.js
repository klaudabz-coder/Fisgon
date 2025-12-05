// Dejamos esto vacío para que todas las cartas sean creadas por ti en el servidor
const itemsGacha = [];

const configRareza = {
    'Legendary': { chance: 1, color: '#FFD700', label: 'LEGENDARIO' },
    'Epic':      { chance: 10, color: '#9932CC', label: 'ÉPICO' },
    'Rare':      { chance: 40, color: '#1E90FF', label: 'RARO' },
    'Common':    { chance: 100, color: '#808080', label: 'COMÚN' }
};

module.exports = { itemsGacha, configRareza };