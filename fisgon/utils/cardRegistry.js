const db = require('../database');
const { itemsGacha } = require('./gachaItems');

// Plantillas de Habilidades por Defecto (para cartas creadas)
const DEFAULT_SKILLS = {
    fighter: [
        { name: 'Ataque', type: 'dmg', power: 1.0, cd: 0, desc: 'Básico' },
        { name: 'Golpe Fuerte', type: 'dmg', power: 1.5, cd: 2, desc: 'Daño extra' },
        { name: 'Grito', type: 'buff_atk', power: 20, cd: 4, desc: '+ATK' },
        { name: 'Defensa', type: 'shield', power: 50, cd: 3, desc: 'Escudo' }
    ],
    support: { name: 'Ayuda', type: 'heal', power: 40, cd: 3, desc: 'Cura básica' }
};

// Generar stats base según rareza
function getBaseStats(rarity) {
    switch (rarity) {
        case 'Legendary': return { hp: 350, atk: 70, def: 40, spd: 30 };
        case 'Epic': return { hp: 280, atk: 55, def: 30, spd: 25 };
        case 'Rare': return { hp: 200, atk: 40, def: 20, spd: 20 };
        default: return { hp: 150, atk: 30, def: 10, spd: 15 };
    }
}

module.exports = {
    // Devuelve TODAS las cartas (Default + Custom del servidor)
    getAllCards: (guildId) => {
        const defaultCards = itemsGacha.map(c => ({ ...c, set: 'default' })); // Marcar como set default
        const customCards = db.getCustomCards(guildId);

        // Rellenar datos faltantes en cartas custom (si los hubiera)
        const filledCustom = customCards.map(c => {
            if (!c.stats) c.stats = getBaseStats(c.rarity);
            if (!c.skills && c.role === 'fighter') c.skills = DEFAULT_SKILLS.fighter;
            if (!c.assist && c.role === 'support') c.assist = DEFAULT_SKILLS.support;
            return c;
        });

        return [...defaultCards, ...filledCustom];
    },

    // Devuelve la lista de SETS disponibles para comprar
    getAvailableSets: (guildId) => {
        const sets = [
            { id: 'default', name: 'Set Básico (Originales)', price: 100 }
        ];

        const customSets = db.getSets(guildId);
        return [...sets, ...customSets];
    },

    // Filtra cartas por Set
    getCardsInSet: (guildId, setId) => {
        const all = module.exports.getAllCards(guildId);
        if (setId === 'default') {
            return all.filter(c => c.set === 'default' || !c.set);
        }
        return all.filter(c => c.set === setId);
    }
};