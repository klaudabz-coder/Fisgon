// Tipos de Habilidades: 'dmg' (Daño), 'heal' (Curar), 'buff' (Subir stats), 'shield' (Escudo)

const itemsGacha = [
    // --- LUCHADORES (Fighters) ---
    { 
        id: 'g_dragon', name: 'Dragón Dorado', rarity: 'Legendary', role: 'fighter', emoji: '🐉',
        image: 'https://i.imgur.com/EjemploDragon.png',
        stats: { hp: 350, atk: 70, def: 40, spd: 25 },
        skills: [
            { name: 'Garra', type: 'dmg', power: 1.0, cd: 0, desc: 'Ataque básico' },
            { name: 'Aliento Fuego', type: 'dmg', power: 1.8, cd: 3, desc: 'Gran daño de fuego' },
            { name: 'Escamas Duras', type: 'buff_def', power: 20, cd: 4, desc: '+20 Defensa (3 turnos)' },
            { name: 'Vuelo', type: 'buff_spd', power: 15, cd: 3, desc: '+15 Velocidad (3 turnos)' }
        ]
    },
    { 
        id: 'g_angel', name: 'Arcángel', rarity: 'Legendary', role: 'fighter', emoji: '👼',
        image: 'https://i.imgur.com/EjemploAngel.png',
        stats: { hp: 300, atk: 60, def: 35, spd: 30 },
        skills: [
            { name: 'Espada Luz', type: 'dmg', power: 1.0, cd: 0, desc: 'Corte de luz' },
            { name: 'Rayo Sagrado', type: 'dmg', power: 2.2, cd: 4, desc: 'Daño masivo sagrado' },
            { name: 'Rezo', type: 'heal', power: 50, cd: 3, desc: 'Recupera 50 HP' },
            { name: 'Juicio', type: 'dmg', power: 1.5, cd: 2, desc: 'Golpe crítico asegurado' }
        ]
    },
    { 
        id: 'g_caballero', name: 'Caballero Oscuro', rarity: 'Epic', role: 'fighter', emoji: '🛡️',
        image: '',
        stats: { hp: 400, atk: 45, def: 50, spd: 10 },
        skills: [
            { name: 'Tajo', type: 'dmg', power: 1.0, cd: 0, desc: 'Golpe pesado' },
            { name: 'Golpe Escudo', type: 'dmg', power: 1.2, cd: 2, desc: 'Daño + Aturdimiento leve' },
            { name: 'Muro Hierro', type: 'shield', power: 100, cd: 4, desc: 'Gana escudo de 100 HP' },
            { name: 'Provocar', type: 'buff_def', power: 30, cd: 3, desc: '+30 Defensa' }
        ]
    },
    { 
        id: 'g_ninja', name: 'Ninja Sombra', rarity: 'Rare', role: 'fighter', emoji: '🥷',
        image: '',
        stats: { hp: 200, atk: 55, def: 15, spd: 60 },
        skills: [
            { name: 'Kunai', type: 'dmg', power: 0.8, cd: 0, desc: 'Ataque muy rápido' },
            { name: 'Corte Sombra', type: 'dmg', power: 1.5, cd: 2, desc: 'Daño crítico' },
            { name: 'Bomba Humo', type: 'buff_spd', power: 30, cd: 3, desc: '+30 Evasión/Velocidad' },
            { name: 'Ejecutar', type: 'dmg', power: 2.5, cd: 5, desc: 'Daño letal' }
        ]
    },
    { 
        id: 'g_gato', name: 'Gato Callejero', rarity: 'Common', role: 'fighter', emoji: '🐱',
        image: '',
        stats: { hp: 150, atk: 30, def: 10, spd: 40 },
        skills: [
            { name: 'Arañazo', type: 'dmg', power: 1.0, cd: 0, desc: 'Rasguño simple' },
            { name: 'Mordida', type: 'dmg', power: 1.2, cd: 2, desc: 'Muerde fuerte' },
            { name: 'Siesta', type: 'heal', power: 30, cd: 3, desc: 'Recupera energía' },
            { name: 'Bufido', type: 'buff_atk', power: 10, cd: 3, desc: '+10 Ataque' }
        ]
    },

    // --- SOPORTES (Supports) ---
    // No pelean directamente, se equipan "atrás" y tienen una habilidad de asistencia
    { 
        id: 'g_unicornio', name: 'Unicornio', rarity: 'Epic', role: 'support', emoji: '🦄',
        image: '',
        stats: { hp: 0, atk: 0, def: 0, spd: 0 }, // Stats irrelevantes, usa assist
        assist: { name: 'Bendición Pura', type: 'heal', power: 80, cd: 3, desc: 'Cura 80 HP al luchador' }
    },
    { 
        id: 'g_mago', name: 'Mago Blanco', rarity: 'Epic', role: 'support', emoji: '🔮',
        image: '',
        stats: { hp: 0, atk: 0, def: 0, spd: 0 },
        assist: { name: 'Potenciar Arma', type: 'buff_atk', power: 20, cd: 3, desc: 'Aumenta el ataque del luchador' }
    },
    { 
        id: 'g_roca', name: 'Roca Mascota', rarity: 'Common', role: 'support', emoji: '🪨',
        image: '',
        stats: { hp: 0, atk: 0, def: 0, spd: 0 },
        assist: { name: 'Piel de Piedra', type: 'shield', power: 50, cd: 4, desc: 'Otorga un escudo de 50 HP' }
    },
    { 
        id: 'g_slime', name: 'Slime Verde', rarity: 'Common', role: 'support', emoji: '🟢',
        image: '',
        stats: { hp: 0, atk: 0, def: 0, spd: 0 },
        assist: { name: 'Baba Pegajosa', type: 'debuff_spd', power: 15, cd: 3, desc: 'Reduce la velocidad del rival' }
    },
    { 
        id: 'g_robot', name: 'Mini Bot', rarity: 'Rare', role: 'support', emoji: '🤖',
        image: '',
        stats: { hp: 0, atk: 0, def: 0, spd: 0 },
        assist: { name: 'Batería Extra', type: 'reduce_cd', power: 1, cd: 4, desc: 'Reduce 1 turno de espera a todas las skills' }
    }
];

const configRareza = {
    'Legendary': { chance: 1, color: '#FFD700', label: 'LEGENDARIO' },
    'Epic':      { chance: 10, color: '#9932CC', label: 'ÉPICO' },
    'Rare':      { chance: 40, color: '#1E90FF', label: 'RARO' },
    'Common':    { chance: 100, color: '#808080', label: 'COMÚN' }
};

module.exports = { itemsGacha, configRareza };