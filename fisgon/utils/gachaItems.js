// Estructura: Stats (Luchador), Skills (Luchador), Assist (Soporte), Synergy (Combo)

const itemsGacha = [
    // --- LEGENDARIOS ---
    { 
        id: 'g_dragon', name: 'Dragón Dorado', rarity: 'Legendary', emoji: '🐉',
        image: 'https://i.imgur.com/EjemploDragon.png',
        stats: { hp: 350, atk: 70, def: 40, spd: 25 },
        skills: [
            { name: 'Garra', type: 'dmg', power: 1.0, cd: 0, desc: 'Ataque básico' },
            { name: 'Aliento Fuego', type: 'dmg', power: 1.8, cd: 3, desc: 'Gran daño de fuego' },
            { name: 'Escamas Duras', type: 'buff_def', power: 20, cd: 4, desc: '+20 Defensa' },
            { name: 'Vuelo', type: 'buff_spd', power: 15, cd: 3, desc: '+15 Velocidad' }
        ],
        assist: { name: 'Rugido de Guerra', type: 'buff_atk', power: 25, cd: 4, desc: 'Aumenta el ATK del luchador' },
        synergy: { target: 'g_caballero', name: 'Alianza de Fuego', desc: '+50 ATK al Caballero' }
    },
    { 
        id: 'g_angel', name: 'Arcángel', rarity: 'Legendary', emoji: '👼',
        image: 'https://i.imgur.com/EjemploAngel.png',
        stats: { hp: 300, atk: 60, def: 35, spd: 30 },
        skills: [
            { name: 'Espada Luz', type: 'dmg', power: 1.0, cd: 0, desc: 'Corte de luz' },
            { name: 'Rayo Sagrado', type: 'dmg', power: 2.2, cd: 4, desc: 'Daño masivo' },
            { name: 'Rezo', type: 'heal', power: 50, cd: 3, desc: 'Cura 50 HP' },
            { name: 'Juicio', type: 'dmg', power: 1.5, cd: 2, desc: 'Golpe crítico' }
        ],
        assist: { name: 'Resurrección', type: 'heal', power: 100, cd: 5, desc: 'Gran cura de emergencia' },
        synergy: { target: 'g_mago', name: 'Luz Arcana', desc: 'Reduce el CD de habilidades del Mago' }
    },

    // --- ÉPICOS ---
    { 
        id: 'g_caballero', name: 'Caballero Oscuro', rarity: 'Epic', emoji: '🛡️',
        image: '',
        stats: { hp: 400, atk: 45, def: 50, spd: 10 },
        skills: [
            { name: 'Tajo', type: 'dmg', power: 1.0, cd: 0, desc: 'Golpe pesado' },
            { name: 'Golpe Escudo', type: 'dmg', power: 1.2, cd: 2, desc: 'Daño + Stun leve' },
            { name: 'Muro Hierro', type: 'shield', power: 100, cd: 4, desc: 'Escudo 100 HP' },
            { name: 'Provocar', type: 'buff_def', power: 30, cd: 3, desc: '+30 Defensa' }
        ],
        assist: { name: 'Guardia Real', type: 'shield', power: 80, cd: 3, desc: 'Otorga escudo al luchador' },
        synergy: { target: 'g_dragon', name: 'Jinete de Dragón', desc: '+80 HP al Dragón' }
    },
    { 
        id: 'g_mago', name: 'Mago Supremo', rarity: 'Epic', emoji: '🔮',
        image: '',
        stats: { hp: 180, atk: 65, def: 15, spd: 40 },
        skills: [
            { name: 'Orbe Mágico', type: 'dmg', power: 1.0, cd: 0, desc: 'Ataque mágico' },
            { name: 'Bola Fuego', type: 'dmg', power: 1.5, cd: 2, desc: 'Daño área' },
            { name: 'Meditación', type: 'reduce_cd', power: 2, cd: 4, desc: '-2 turnos a skills' },
            { name: 'Rayo', type: 'dmg', power: 2.0, cd: 4, desc: 'Daño masivo' }
        ],
        assist: { name: 'Recarga de Maná', type: 'reduce_cd', power: 1, cd: 3, desc: 'Reduce cooldowns' },
        synergy: { target: 'g_angel', name: 'Bendición Mágica', desc: '+30 ATK al Ángel' }
    },

    // --- RAROS Y COMUNES ---
    { 
        id: 'g_ninja', name: 'Ninja', rarity: 'Rare', emoji: '🥷',
        image: '',
        stats: { hp: 200, atk: 55, def: 15, spd: 60 },
        skills: [
            { name: 'Kunai', type: 'dmg', power: 0.8, cd: 0, desc: 'Rápido' },
            { name: 'Sombra', type: 'buff_spd', power: 30, cd: 3, desc: '+Evasión' },
            { name: 'Corte', type: 'dmg', power: 1.5, cd: 2, desc: 'Crítico' },
            { name: 'Veneno', type: 'debuff_spd', power: 10, cd: 3, desc: 'Ralentiza' }
        ],
        assist: { name: 'Cortina de Humo', type: 'buff_spd', power: 20, cd: 3, desc: 'Sube velocidad' },
        synergy: null
    },
    { 
        id: 'g_unicornio', name: 'Unicornio', rarity: 'Epic', emoji: '🦄',
        image: '',
        stats: { hp: 250, atk: 35, def: 20, spd: 45 },
        skills: [
            { name: 'Patada', type: 'dmg', power: 1.0, cd: 0, desc: 'Golpe' },
            { name: 'Luz Curativa', type: 'heal', power: 40, cd: 3, desc: 'Cura propia' },
            { name: 'Carga', type: 'dmg', power: 1.3, cd: 2, desc: 'Embestida' },
            { name: 'Brillo', type: 'debuff_spd', power: 15, cd: 3, desc: 'Ciega rival' }
        ],
        assist: { name: 'Bendición Pura', type: 'heal', power: 60, cd: 3, desc: 'Cura al luchador' },
        synergy: null
    },
    { 
        id: 'g_slime', name: 'Slime Verde', rarity: 'Common', emoji: '🟢',
        image: '',
        stats: { hp: 150, atk: 25, def: 10, spd: 10 },
        skills: [
            { name: 'Placaje', type: 'dmg', power: 1.0, cd: 0, desc: 'Golpe' },
            { name: 'Dividirse', type: 'heal', power: 20, cd: 3, desc: 'Cura poco' },
            { name: 'Ácido', type: 'dmg', power: 1.2, cd: 2, desc: 'Quema' },
            { name: 'Saltar', type: 'buff_spd', power: 5, cd: 3, desc: '+Velocidad' }
        ],
        assist: { name: 'Pegamento', type: 'debuff_spd', power: 10, cd: 3, desc: 'Baja velocidad rival' },
        synergy: null
    }
];

const configRareza = {
    'Legendary': { chance: 1, color: '#FFD700', label: 'LEGENDARIO' },
    'Epic':      { chance: 10, color: '#9932CC', label: 'ÉPICO' },
    'Rare':      { chance: 40, color: '#1E90FF', label: 'RARO' },
    'Common':    { chance: 100, color: '#808080', label: 'COMÚN' }
};

module.exports = { itemsGacha, configRareza };