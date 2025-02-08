const express = require('express');
const app = express();
const cron = require('node-cron');
const serverless = require("serverless-http");
const rateLimiting = require('express-rate-limit');
const dotenv = require('dotenv');
const newsScraping = require('./tasks/newsScraping');
const csMovement = require('./tasks/csMovement');
const telegramBot = require('node-telegram-bot-api');
const logger = require('./log');
const PORT = process.env.PORT || 3000;


// Middleware and routes
app.use(express.json());
dotenv.config();

app.use(rateLimiting({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Here I limit each IP to 100 requests
    message: 'You have exceeded the 100 requests in 15 minutes limit!',
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
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

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
            logger.info(`Welcoming user: ${userName}`);
            const userName = user.first_name;
            setTimeout(() => { bot.sendMessage( chatId,`Hello <b>${userName}</b>, Welcome to the Invest with Micah community!\n \nI am <b>Cucuh</b>, Mr. Micah's Assistant, and still under development.\n \nFeel free to ask any questions you might have about investing. Like-minded members in the community will be happy to help.\n \nIf you're interested in learning how to research and find good stocks to buy, check out Mr. Micah's course on investing:\n \n <a href="https://selar.co/unconventionalinvestor">Click here for the course</a>.`,{ parse_mode: 'HTML'});
        },3000);
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
        
        if (typeof msg.text !== 'string') {
            logger.info(`Invalid Message received from ${userName} in chat ID ${chatId}`);
            return bot.sendMessage(msg.chat.id, "Invalid Message. I only respond to text based messages.");
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

const scrapeNews = async () => {
    logger.info('Starting to Scrape news...');

    try{

        const news = await newsScraping.fetchRss();

        news.forEach((item, index) => {
            const category = item.link.includes('nairametrics') ? 'Finance' : 'Crypto';
            const message = `
    <b>Today's Headlines in Nigeria Around ${category}:</b>
    
    <b>${item.title}</b>
    
    📰 <b>ARTICLE SNIPPET:</b>
    ${item.contentSnippet}
    
    🔗 <b>Link:</b> 
    <a href="${item.link}">${item.link}</a>
            `;
            // Add a delay of 3 minutes between each news item
            setTimeout(() => {
                bot.sendMessage(storedChatId, message, { parse_mode: 'HTML' });
            }, index * 3 * 60 * 1000); // index * 5 minutes (in ms)
        });
    }
    catch(error){
        logger.error(`Error scraping news:${error.message}`, { stack: error.stack });
    }

};


// Function to fetch market data and send a summary
const sendMarketSummary = async () => {
    logger.info('Sending market summary...');
    try {
        const marketSummary = await csMovement.fetchCsuRate();

        if(!marketSummary){
            return bot.sendMessage(storedChatId, 'Sorry, I could not fetch the market data at the moment. Will try again later.');
        }
        // Craft the message
        const message = `
<b>📊 Market Summary for Today:</b>

<b>💹 Crypto Prices:</b>
- Bitcoin: $${marketSummary.crypto.bitcoin.usd.toLocaleString()} (${marketSummary.crypto.bitcoin.usd_24h_change.toFixed(2)}%)
- Solana: $${marketSummary.crypto.solana.usd.toLocaleString()} (${marketSummary.crypto.solana.usd_24h_change.toFixed(2)}%)

<b>💱 Black Market Naira to Dollar Rate:</b>
- Buy: ₦${marketSummary.nairatoDollar[0].price_buy.toLocaleString()}
- Sell: ₦${marketSummary.nairatoDollar[0].price_sell.toLocaleString()}

<b>📈  Top Advancers:</b>
${marketSummary.stocks.topAdvancers.map(stock => `- ${stock.SYMBOL}: ${stock.PERCENTAGE_CHANGE}%`).join('\n')}

<b>📉 Top Losers:</b>
${marketSummary.stocks.topLosers.map(stock => `- ${stock.SYMBOL}: ${stock.PERCENTAGE_CHANGE}%`).join('\n')}

<b>💰 Top Trades: By Value Traded </b>
${marketSummary.stocks.topTrades.map(stock => `- ${stock.Symbol}: ₦${stock.value.toLocaleString()}`).join('\n')}

<b>⭐ Micah's 2025 Stock Picks:</b>
${marketSummary.stockPicks.map(stock => `- ${stock.Symbol}: ₦${stock.ClosePrice} (${stock.PercChange}%)`).join('\n')}

<b>⭐ Remember to Invest Wisely, Ndewo! </b>
`;

        // Send the message to the stored chat ID

        console.log(message);
        bot.sendMessage(storedChatId, message, { parse_mode: 'HTML' });
    } catch (error) {
        logger.error(`Error sending market summary: ${error.message}`, { stack: error.stack });
        // console.error('Error sending market summary:', error);
    }
};

// Schedule the market summary to be sent every day at 6 PM WAT
// cron.schedule('0 18 * * *', async () => {
//     sendMarketSummary();
// });

cron.schedule('*/2 * * * *', async () => {
    sendMarketSummary();
});

// Schedule the scrapeNews function to run every morning at 7 AM WAT
// cron.schedule('0 6 * * *', scrapeNews);

cron.schedule('*/5 * * * *', async () => {
    scrapeNews();
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1); // Exit after logging the error
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});

if (process.env.NODE_ENV === 'development') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
module.exports = serverless(app);