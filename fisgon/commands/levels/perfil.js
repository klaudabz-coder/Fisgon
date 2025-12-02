const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { xpInfoFromTotal } = require('../../utils/levels');
const { generarImagenProgreso } = require('../../utils/canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil') // <--- CAMBIO AQUÍ: Ahora es solo "perfil"
    .setDescription('Muestra tu nivel y progreso visual, o el de otro usuario')
    .addUserOption(u => u.setName('usuario').setDescription('Usuario a consultar')),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const datos = db.getLevel(interaction.guild.id, user.id);
    const xpTotal = datos.xp || 0;
    const info = xpInfoFromTotal(xpTotal);
    const nivel = info.level;
    const xpInto = info.xpIntoLevel;
    const xpForNext = info.xpForNext;

    try {
      const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
      const buffer = await generarImagenProgreso({
        username: user.username,
        tag: user.discriminator ? `${user.discriminator}` : user.tag,
        avatarURL,
        level: nivel,
        xpInto,
        xpForNext,
        width: 900
      });
      const attachment = new AttachmentBuilder(buffer, { name: 'progreso.png' });

      const embed = new EmbedBuilder()
        .setTitle(`${user.tag} — Perfil de nivel`)
        .setDescription(`Nivel ${nivel} • XP: ${xpInto} / ${xpForNext} (total: ${xpTotal})`)
        .setColor('#60a5fa')
        .setTimestamp()
        .setImage('attachment://progreso.png')
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true }));

      await interaction.reply({ embeds: [embed], files: [attachment] });
    } catch (e) {
      console.error('Error generando imagen en comando perfil:', e);
      const porcentaje = Math.round((xpInto / Math.max(1, xpForNext)) * 100);
      const texto = `📊 **${user.tag}** — Nivel ${nivel}\nProgreso: ${porcentaje}%\nXP: ${xpInto} / ${xpForNext} (total: ${xpTotal})`;
      await interaction.reply({ content: texto });
    }
  }
};