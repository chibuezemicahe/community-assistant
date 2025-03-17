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
        if (!Array.isArray(news) || news.length === 0) {
            logger.info('No news items found');
            process.exit(0);
        }

        // Use Promise.all to wait for all messages to be sent
        await Promise.all(news.map((item, index) => {
            return new Promise((resolve) => {
                const category = item.link.includes('nairametrics') ? 'Finance' : 'Crypto';
                const message = `
<b>Today's Headlines in Nigeria Around ${category}:</b>

<b>${item.title}</b>

📰 <b>ARTICLE SNIPPET:</b>
${item.contentSnippet}

🔗 <b>Link:</b> 
<a href="${item.link}">${item.link}</a>
                `;

                setTimeout(async () => {
                    try {
                        await bot.sendMessage(storedChatId, message, { parse_mode: 'HTML' });
                        logger.info(`Sent news item ${index + 1}`);
                    } catch (err) {
                        logger.error(`Failed to send message: ${err.message}`);
                    }
                    resolve();
                }, index * 3000); // Reduced to 3 seconds for GitHub Actions
            });
        }));

        logger.info('News scraping completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error(`Error scraping news: ${error.message}`, { stack: error.stack });
        process.exit(1);
    }
};

// Handle process errors
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
    process.exit(1);
});

scrapeNews();