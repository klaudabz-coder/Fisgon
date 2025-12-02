const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerta-social')
    .setDescription('Configura notificaciones para TikTok o Instagram')
    .addSubcommand(sub => 
        sub.setName('agregar')
           .setDescription('Agrega una nueva alerta')
           .addStringOption(o => o.setName('plataforma').setDescription('Red social').setRequired(true).addChoices({name: 'TikTok', value: 'tiktok'}, {name: 'Instagram', value: 'instagram'}))
           .addStringOption(o => o.setName('usuario').setDescription('Nombre de usuario en la red social (sin @)').setRequired(true))
           .addChannelOption(o => o.setName('canal').setDescription('Canal donde avisar').setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub => 
        sub.setName('remover')
           .setDescription('Elimina una alerta existente')
           .addStringOption(o => o.setName('plataforma').setDescription('Red social').setRequired(true).addChoices({name: 'TikTok', value: 'tiktok'}, {name: 'Instagram', value: 'instagram'}))
           .addStringOption(o => o.setName('usuario').setDescription('Nombre de usuario a eliminar').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const platform = interaction.options.getString('plataforma');
    const username = interaction.options.getString('usuario');

    if (sub === 'agregar') {
        const canal = interaction.options.getChannel('canal');
        // Guardamos en la DB
        db.addSocialFeed(interaction.guild.id, platform, username, canal.id);
        return interaction.reply({ content: `✅ Alerta configurada. Avisaré en ${canal} cuando **${username}** suba contenido a **${platform}**.`, ephemeral: true });
    }

    if (sub === 'remover') {
        db.removeSocialFeed(interaction.guild.id, platform, username);
        return interaction.reply({ content: `🗑️ Alerta eliminada para **${username}** en **${platform}**.`, ephemeral: true });
    }
  }
};