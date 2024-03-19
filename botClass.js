// BotClass.js
const { Client, Events, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class Bot {
  constructor(token) {
    this.client = new Client({
      intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.GuildPresences, 
		GatewayIntentBits.GuildMessageReactions, 
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
      partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
    });

    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}`);
    });

    this.client.login(token);
  }

  // Additional methods here
}

module.exports = Bot;
