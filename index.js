const express = require('express');
const cron = require('node-cron');
const app = express();
const rateLimiting = require('express-rate-limit');
const dotenv = require('dotenv');
const newsScraping = require('./tasks/newsScraping');
const csMovement = require('./tasks/csMovement');
const telegramBot = require('node-telegram-bot-api');
const logger = require('./log');
const PORT = process.env.PORT || 3000;
const axios = require('axios');

app.set('trust proxy', true);

// Middleware and routes
app.use(express.json());
dotenv.config();

app.use(rateLimiting({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Here I limit each IP to 100 requests
    message: 'You have exceeded the 100 requests in 15 minutes limit!',
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown-ip';
    }
}));

['TGBOTTOKEN', 'STOREDCHATID'].forEach((key) => {
    if (!process.env[key]) {
        logger.error(`Environment variable ${key} is missing.`);
        throw new Error(`Missing environment variable: ${key}`);
    }
});



const bot = new telegramBot(process.env.TGBOTTOKEN);

// Telegram Bot webhook setup
bot.setWebHook(`${process.env.BASE_URL}/api/webhook`);
app.post('/api/webhook', (req, res) => {
    res.sendStatus(200);
    bot.processUpdate(req.body);
  });

  setInterval(async () => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/ping`);
        console.log(`Ping successful: ${response.status}`);
    } catch (error) {
        console.error(`Ping failed: ${error.message}`);
    }
}, 5 * 60 * 1000); // Every 5 minutes

  
const storedChatId = process.env.STOREDCHATID;

const userRateLimits = new Map(); // Track user requests and timestamps
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds


// This code below is for the bot to send a message to the user when they join the group
bot.on('new_chat_members',(msg)=>{
    const chatId = msg.chat.id;
    logger.info(`New chat member(s) joined in chat ID: ${chatId}`);
    // console.log(storedChatId);
    msg.new_chat_members.forEach(user=>{
        if(!user.is_bot){
            const userName = user.first_name;
            logger.info(`Welcoming user: ${userName}`);
            setTimeout(() => { bot.sendMessage( chatId,`Hello <b>${userName}</b>, Welcome to the Invest with Micah community!\n \nI am <b>Cucuh</b>, Mr. Micah's Assistant, and still under development.\n \nFeel free to ask any questions you might have about investing. Like-minded members in the community will be happy to help.\n \nIf you're interested in learning how to research and find good stocks to buy, check out Mr. Micah's course on investing:\n \n <a href="https://selar.co/unconventionalinvestor">Click here for the course</a>.`,{ parse_mode: 'HTML'});
        },10000);
        }
    })
});

bot.on('message', async (msg) => {

    try{
      
        const chatId = msg.chat.id;
        const userName = msg.from.first_name || 'there';
        const msgText = msg.text || '';
    
        if (userRateLimits.has(msg.from.id)) {
            const lastRequestTime = userRateLimits.get(msg.from.id);
            const timeDiff = Date.now() - lastRequestTime;
    
            if (timeDiff < RATE_LIMIT_WINDOW) {
                logger.info(`This ${userName} in chat ID ${chatId}: Sent this ${msgText}, and it seems like he is spamming the bot`); 
                return bot.sendMessage(chatId, `Please wait a moment before sending another message, ${userName}`);
            }
        }
    
        userRateLimits.set(msg.from.id, Date.now());
        
      


        console.log(storedChatId);
        const botInfo = await bot.getMe();
        const adminName = "Micah Erumaka";
    
        const adminUsername = "Micaherums"; // Admin's username to check against mentions
        
        if (!msgText && !msg.new_chat_members && !msg.left_chat_member && !msg.pinned_message) {
            logger.info(`Invalid Message received from ${userName} in chat ID ${chatId}`);
            return bot.sendMessage(chatId, "Invalid Message. I only respond to text-based messages.");
        }
        // First, check if the message is a reply to the bot
        if (msg.reply_to_message && msg.reply_to_message.from.id === botInfo.id) {
            logger.info(`Bot sent message to ${userName} in chat ID ${chatId}:`);
            setTimeout(() => {   
                bot.sendMessage(chatId, `Hello ${userName}, I am Cucuh, Mr Micah's Assistant.\n \nCurrently, I am still a work in progress and can't really respond adequately. Once my Boss Micah is online, he will respond to your message. Feel free to ask me any questions you might have around investing.\n \nAnd remember to check out Mr Micah's course on investing using the link below:\n \n<a href="https://selar.co/unconventionalinvestor">Click here for the course</a>`, { parse_mode: 'HTML' });
        },3000)
        }
    
        else if (botInfo && msgText.includes(`@${botInfo.username}`)) {
            logger.info(`Bot mentioned by ${userName} in chat ID ${chatId}`);
            setTimeout(() => { bot.sendMessage(chatId, `Hi ${userName}, you mentioned me? How can I assist you today?\n \nIf you have any questions about investing, feel free to ask. Community members are also available to help.\n \nAlso, don't forget to check out Mr Micah's course on investing using the link below: That would help you get started\n \n<a href="https://selar.co/unconventionalinvestor">Click here for the course</a>`, { parse_mode: 'HTML' });}, 3000);
           
        } else if (msgText.includes(`@${adminUsername}`)) {
            logger.info(`Admin mentioned by ${userName} in chat ID ${chatId}`);
           setTimeout(()=>{
            bot.sendMessage(chatId, `Hello ${userName}, you mentioned Mr ${adminName}.\n \nHe is currently unavailable, but community members can also try to help you with your queries.\n \nOnce Micah is online, he will respond to your message.\n \n In the meantime, you can wait for his response or check out his course on investing using the link below:\n \n<a href="https://selar.co/unconventionalinvestor">Click here for the course</a>`, { parse_mode: 'HTML' });
           },3000);    
        } 
    }catch(error){
        // console.error('Error in bot.on(message):', error);
        logger.error(`Error in bot.on(message): ${error.message}`,  { stack: error.stack });
        bot.sendMessage(msg.chat.id, "Sorry, something went wrong. Micah Will handle this once Active.");
    }

});

setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of userRateLimits) {
        if (now - timestamp > RATE_LIMIT_WINDOW) {
            userRateLimits.delete(userId);
        }
    }
}, RATE_LIMIT_WINDOW);

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1); // Exit after logging the error
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});


app.listen(PORT,()=>{
console.log(`listening to ${PORT}` )
})