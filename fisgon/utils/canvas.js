async function generarImagenProgreso({ username, tag, avatarURL, level, xpInto, xpForNext, width = 900 }) {
  const height = 280;
  const porcentaje = Math.min(1, xpInto / Math.max(1, xpForNext));

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  try {
    const avatar = await loadImage(avatarURL);
    const avatarSize = 120;
    const avatarX = 40;
    const avatarY = (height - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(40, (height - 120) / 2, 120, 120);
  }

  const textX = 190;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Sans';
  ctx.fillText(username, textX, 70);

  ctx.fillStyle = '#a0a0a0';
  ctx.font = '20px Sans';
  ctx.fillText(tag ? `#${tag}` : '', textX, 100);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(`Nivel ${level}`, textX, 145);

  const barX = textX;
  const barY = 170;
  const barWidth = width - textX - 50;
  const barHeight = 30;

  ctx.fillStyle = '#3a3a4a';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 15);
  ctx.fill();

  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth * porcentaje, barY);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#60a5fa');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * porcentaje, barHeight, 15);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Sans';
  const xpText = `${xpInto} / ${xpForNext} XP`;
  ctx.fillText(xpText, barX + barWidth / 2 - ctx.measureText(xpText).width / 2, barY + 22);

  const pctText = `${Math.round(porcentaje * 100)}%`;
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '16px Sans';
  ctx.fillText(pctText, barX + barWidth - 50, barY + 55);

  return canvas.toBuffer('image/png');
}

module.exports = { generarImagenProgreso };
