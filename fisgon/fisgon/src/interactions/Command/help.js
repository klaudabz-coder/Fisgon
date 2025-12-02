

const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Discord = require('discord.js');
const moment = require("moment");
require("moment-duration-format");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with the bot'),

  /** 
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {String[]} args
   */

  run: async (client, interaction, args) => {
    const toUpperCase = (string) => string.charAt(0).toUpperCase() + string.slice(1);
    const commad = (name) => {
      let text = `*To Run Any Command Type*: \`/${name} {Sub Command Name}\``
      let text2 = client.commands.filter(x => x.data.name == name).map((x) => x.data.options.map((c) => '`' + c.name + '` - ' + c.description).join("\n"));
      return text2 + `\n\n` + text
    }
    
    let em1 = new EmbedBuilder()
      .setAuthor({ name: `${client.user.username}\'s Help Menu`, iconURL: client.user.displayAvatarURL({ format: "png" }), url: "https://discord.gg/uoaio" })
      .setImage(`https://i.stack.imgur.com/Fzh0w.png`)
      .setColor(`#5865F2`)
      .addFields([
        {
          name: "Categories [1-9]",
          value: `>>> <:blue_snowflake:1012018251284361326>┆AFK
          <:mega_phone:1012037897857282098>┆Announcement
          <:mod_shield:1012017403892346921>┆Auto mod
          <:settings:1012018247031328868>┆Auto setup
          <:presentgift:1012018258137862275>┆Birthday
          <:discord_bot:1012038552521031703>┆Bot
          <:huge_smile:1012038461357817968>┆Casino
          <:settings:1012018247031328868>┆Configuration
          <:blue_stars:1012018254174232596>┆Custom commands`,
          inline: true
        },
        {
          name: "Categories [19-27]",
          value: `>>> <:to_space:1012038751729491968>┆Leveling
          <:values:1012038654916579358>┆Messages
          <:mod_shield:1012017403892346921>┆Moderation
          <:musicnotes:1012017302755094609>┆Music
          <:uo_paper:1015550831199789146>┆Notepad
          <:member:1012017243837702174>┆Profile
          <:uo_voice_channel:1015566886303440906>┆Radio
          <:huge_smile:1012038461357817968>┆Reaction roles
          <:ways:1012018245429121075>┆Search`,
          inline: true
        },
        {
          name: "\u200b",
          value: "\u200b",
          inline: true
        },
        {
          name: "Categories [10-18]",
          value: `>>> <:emoji_50:1015861852321874002>┆Dcredits
          <:uo_dcoin:1015563002591842314>┆Economy
          <:blue_stars:1012018254174232596>┆Family
          <:huge_smile:1012038461357817968>┆Fun
          <:to_space:1012038751729491968>┆Games
          <:uo_party:1015552073405841458>┆Giveaway
          <:discord:1012017257158824027>┆Guild settings
          <:image:1012017406572499075>┆Images
          <:add:1012018622912274502>┆Invites`,
          inline: true
        }, {
          name: "Categories Part [28-36]",
          value: `>>> <:plane:1012017388440531015>┆Server stats
          <:settings:1012018247031328868>┆Setup
          <:ways:1012018245429121075>┆Soundboard
          <:hashtag:1012018249854091415>┆Sticky messages
          <:heart_blue:1012017400314613761>┆Suggestions
          <:beIl:1012017395910594620>┆Thanks
          <:blue_ticket:1012017313878388816>┆Tickets
          <:blue_hammers:1012018248163786763>┆Tools
          <:uo_voice_channel:1015566886303440906>┆Voice`,
          inline: true
        },
        {
          name: "\u200b",
          value: "\u200b",
          inline: true
        },
      ])


    let startButton = new ButtonBuilder().setStyle(2).setEmoji(`⏮️`).setCustomId('start'),
      backButton = new ButtonBuilder().setStyle(2).setEmoji(`⬅️`).setCustomId('back'),
      forwardButton = new ButtonBuilder().setStyle(2).setEmoji(`➡️`).setCustomId('forward'),
      endButton = new ButtonBuilder().setStyle(2).setEmoji(`⏭️`).setCustomId('end'),
      link = new ButtonBuilder().setStyle(5).setLabel("S" + "u" + "b" + "sc" + "ri" + "b" + "e" + "!").setEmoji(`🥹`).setURL('https://rebrand.ly/uo-dev')

    const options = [{ label: 'Owerview', value: '0' }]
    const options2 = []
    
    let counter = 0
    let counter2 = 25
    require("fs").readdirSync(`${process.cwd()}/src/commands`).slice(0, 24).forEach(dirs => {
      counter++
      const opt = {
        label: toUpperCase(dirs.replace("-", " ")),
        value: `${counter}`
      }
      options.push(opt)
    })
    require("fs").readdirSync(`${process.cwd()}/src/commands`).slice(25, 37).forEach(dirs => {
      counter2++
      const opt = {
        label: toUpperCase(dirs.replace("-", " ")),
        value: `${counter2}`
      }
      options2.push(opt)
    })
    
    let menu = new StringSelectMenuBuilder().setPlaceholder('Change page').setCustomId('pagMenu').addOptions(options).setMaxValues(1).setMinValues(1),
      menu2 = new StringSelectMenuBuilder().setPlaceholder('Change page').setCustomId('pagMenu2').addOptions(options2).setMaxValues(1).setMinValues(1)

    const allButtons = [startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false), link]

    let group1 = new ActionRowBuilder().addComponents(menu)
    let group2 = new ActionRowBuilder().addComponents(allButtons)
    let group3 = new ActionRowBuilder().addComponents(menu2)

    const components = [group2, group1, group3]
    
    let helpMessage = await interaction.reply({
      content: `Click on the buttons to change page`,
      embeds: [em1],
      components: components,
    })
    
    const collector = helpMessage.createMessageComponentCollector((button) => button.user.id === interaction.user.id, { time: 60e3 });

    var embeds = [em1]
    
    require("fs").readdirSync(`${process.cwd()}/src/commands`).forEach(dirs => {embeds.push(new EmbedBuilder().setAuthor({name: toUpperCase(dirs),iconURL: client.user.displayAvatarURL({format:"png"}),url:`h`+`tt`+`ps:`+`//`+`d`+`s`+`c`+`.`+`gg`+`/u`+`o`+`a`+`i`+`o`}).setDescription(`${commad(dirs)}`))})

    let currentPage = 0

    collector.on('collect', async (b) => {
      if (b.user.id !== interaction.user.id)
        return b.reply({
          content: `**You Can't Use it\n**`,
          ephemeral: true
        });
      switch (b.customId) {
        case 'start':
          currentPage = 0
          group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)])
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        case 'back':
          --currentPage;
          if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        case 'forward':
          currentPage++;
          if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        case 'end':
          currentPage = embeds.length - 1;
          group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)])
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        case 'pagMenu':
          currentPage = parseInt(b.values[0])
          if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        case 'pagMenu2':
          currentPage = parseInt(b.values[0])
          if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
          b.update({ embeds: [embeds[currentPage]], components: components })
          break;
        default:
          currentPage = 0
          b.update({ embeds: [embeds[currentPage]], components: null })
          break;
      }
    });

    collector.on('end', b => {
      b.update({ embeds: [helpMessage.embeds[0]], content: [], components: [] })
    });

    collector.on('error', (e) => console.log(e));

    embeds.map((embed, index) => {
      embed.setColor("#5865F2").setImage(`https://i.stack.imgur.com/Fzh0w.png`)
        .setFooter({ text: `Page ${index + 1} / ${embeds.length}`, iconURL: client.user.displayAvatarURL() });
    })

  },
};