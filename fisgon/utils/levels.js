// Acepta un objeto config con { base, exponent }
function xpForLevel(level, config = { base: 100, exponent: 1.5 }) {
  // Fórmula: Base * (Nivel ^ Exponente)
  return Math.floor(config.base * Math.pow(level, config.exponent));
}

function levelFromXp(totalXp, config = { base: 100, exponent: 1.5 }) {
  let level = 0;
  let xpNeeded = 0;
  while (totalXp >= xpNeeded + xpForLevel(level + 1, config)) {
    xpNeeded += xpForLevel(level + 1, config);
    level++;
  }
  return level;
}

function xpInfoFromTotal(totalXp, config = { base: 100, exponent: 1.5 }) {
  let level = 0;
  let xpUsed = 0;
  while (totalXp >= xpUsed + xpForLevel(level + 1, config)) {
    xpUsed += xpForLevel(level + 1, config);
    level++;
  }
  const xpIntoLevel = totalXp - xpUsed;
  const xpForNext = xpForLevel(level + 1, config);
  return { level, xpIntoLevel, xpForNext };
}

function crearBarraProgreso(current, total, size = 10) {
    const percentage = current / Math.max(total, 1);
    const progress = Math.round((size * percentage));
    const emptyProgress = size - progress;
    const progressText = '🟩'.repeat(Math.min(progress, size));
    const emptyProgressText = '⬛'.repeat(Math.max(emptyProgress, 0));
    return progressText + emptyProgressText;
}

module.exports = { xpForLevel, levelFromXp, xpInfoFromTotal, crearBarraProgreso };