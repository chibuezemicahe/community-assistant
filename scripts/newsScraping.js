require('dotenv').config();
const telegramBot = require('node-telegram-bot-api');
const newsScraping = require('../tasks/newsScraping');
const logger = require('../log');

const bot = new telegramBot(process.env.TGBOTTOKEN);
const storedChatId = process.env.STOREDCHATID;

const scrapeNews = async () => {
    logger.info('Starting to Scrape news...');

    try {
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

            setTimeout(() => {
                bot.sendMessage(storedChatId, message, { parse_mode: 'HTML' });
            }, index * 3 * 60 * 1000);
        });
    } catch (error) {
        logger.error(`Error scraping news: ${error.message}`, { stack: error.stack });
    }
};

scrapeNews();
