function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function levelFromXp(totalXp) {
  let level = 0;
  let xpNeeded = 0;
  while (totalXp >= xpNeeded + xpForLevel(level + 1)) {
    xpNeeded += xpForLevel(level + 1);
    level++;
  }
  return level;
}

function xpInfoFromTotal(totalXp) {
  let level = 0;
  let xpUsed = 0;
  while (totalXp >= xpUsed + xpForLevel(level + 1)) {
    xpUsed += xpForLevel(level + 1);
    level++;
  }
  const xpIntoLevel = totalXp - xpUsed;
  const xpForNext = xpForLevel(level + 1);
  return { level, xpIntoLevel, xpForNext };
}

module.exports = { xpForLevel, levelFromXp, xpInfoFromTotal };
