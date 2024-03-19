// Require the necessary discord.js classes
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

global.guildId = '797133925616975933';
global.roleId = '1173006836312588339';

const Bot = require('./botClass.js');
const botToken = process.env.DISCORD_TOKEN;
const myBot = new Bot(botToken);

const { checkforActiveSubscription } = require('./stripe/verification');

const webhookApp = require('./stripe/webhooks.js')(myBot.client);
const PORT = process.env.PORT || 3000;





// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.

myBot.client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    webhookApp.listen(PORT, () => {
        console.log(`Webhook service running on port ${PORT}`);
    });
    deleteBotMessagesToUser('408163545830785024');
});



/*
myBot.client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    const embed = new EmbedBuilder()
        .setColor('#62E643') // Custom border color
        .setTitle('Exclusive Access to Rich By Noon')
        .setDescription('For access to the money making members only Livestreams and Community chats "Rich By Noon",')
        .addFields({ name: 'Available', value: '24/7 Access 💰🤑', inline: true })
        .setImage('https://i.imgur.com/oI9k9PL.jpg');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('get_access')
                .setLabel('Get Access')
                .setStyle(ButtonStyle.Primary)
        );

    const channel = myBot.client.channels.cache.get('1020491005092442132');
    channel.send({ embeds: [embed], components: [row] });
});
*/


// Log in to Discord with your client's token
myBot.client.login(botToken);


myBot.client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'get_access') {
        // Open a DM with the user
        const dmChannel = await interaction.user.createDM();
        dmChannel.send(`Hey there! Did you already create your account at https://richbynoon.live ? 
If so...shoot me the email you used to sign up and ill activate your account 😊`);
        interaction.reply({ content: 'I just sent you a DM!', ephemeral: true });
    }
});


myBot.client.on('messageCreate', async (message) => {
    if (message.guildId) return;
	if (message.author.bot) return;
    const userId = message.author.id; 
    try {
        // Fetch the last 15 messages from the channel
        const fetchedMessages = await message.channel.messages.fetch({ limit: 15 });
        
        // Create an array of message objects
        let messages = fetchedMessages.map(msg => {
            return {
                role: msg.author.bot ? 'assistant' : 'user', // Tag 'assistant' if bot, 'user' otherwise
                content: msg.content
            };
        }).reverse(); // Reverse to have the latest message at the end

        // Prepend a system prompt
        const systemPrompt = {
            role: 'system',
            content: `You are a human like artificial intelligence that handles member verification for "The App God"  also known as "AG" he is a young black stock options trader in atlanta that has a trading community called "Rich By Noon" and a Private Youtube Livestream 

			You verify that discord members have active subscriptions in stripe so that you can assign them a member role "richbynoon" and they can view the locked channels "livestream" and "community chat" which allows them to see the private youtube links we use for the rich by noon livestream. 
					   
			If its the first message say hi and ask if they need help with activating their discord account to get access to the "Rich By Noon" Private Livestreams. Then Ask users for their email to verify their memberships. So you can add their member role and give them access to the locked discord channels so they can start making money in the stock market.
			
            If they havent signed up yet they can do so at https://richbynoon.live to get full access
		    
            If they say that they are an existing member who had access but lost it. Tell them you need their email just to verify if their old subscription is still active 

            You are currently being messaged by a discord user with the discord user id ${userId}
            `
        };

        messages = [systemPrompt, ...messages]; // Add the system prompt at the beginning

        let functions =  [
            {
              name: 'checkforActiveSubscription',
              description: 'check Stripe for matching email with active subscription',
              parameters: {
                type: 'object',
                properties: {
                    customerEmail: {
                        type: 'string',
                        description: 'This user\'s email address'
                      },
                      discordUserId: {
                        type: 'string',
                        description: 'The discord user id of the person we are talking to'
                      }
                },
                required: ['discordUserId', 'customerEmail']
              }
            }
            /* add another object function here */
          ]

		const createChatObject = {
			model: 'gpt-4',
			messages,
            functions,
            function_call: 'auto',
			max_tokens: 500,
			temperature: 0.7,
			top_p: 0.8
		};

		const response = await openai.chat.completions.create(createChatObject);
        const responseMessage = response.choices[0].message;

        if (responseMessage.function_call) {
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);
            const functionName = responseMessage.function_call.name;

            const functionResponse = await checkforActiveSubscription(
                myBot.client,
                functionArgs.customerEmail,
                functionArgs.discordUserId,
            );
      
            messages.push({
              role: 'function',
              name: functionName,
              content: functionResponse
            });
      
      
            const secondResponse = await openai.chat.completions.create({
              model: 'gpt-4',
              messages,
            functions,
            function_call: 'auto',
			max_tokens: 500,
			temperature: 0.7,
			top_p: 0.8
            });
            message.reply(secondResponse.choices[0].message.content);
            return;
          }

		message.reply(response.choices[0].message.content);

    } catch (error) {
        console.error('Error fetching messages: ', error);
    }
});




const deleteBotMessagesToUser = async (userId) => {
    try {
        const botId = myBot.client.user.id;
        const dmChannel = await myBot.client.users.cache.get(userId).createDM();

        const messages = await dmChannel.messages.fetch({ limit: 100 });
        const messagesToDelete = messages.filter(m => m.author.id === botId);

        for (const message of messagesToDelete.values()) {
            await message.delete();
        }
        console.log("Bot messages deleted successfully.");
    } catch (error) {
        console.error('Error deleting bot messages: ', error);
    }
};


