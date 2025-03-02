require('dotenv').config();
const telegramBot = require('node-telegram-bot-api');
const csMovement = require('../tasks/csMovement');
const logger = require('../log');

const bot = new telegramBot(process.env.TGBOTTOKEN);
const storedChatId = process.env.STOREDCHATID;

const sendMarketSummary = async () => {
    logger.info('Sending market summary...');
    try {
        const marketSummary = await csMovement.fetchCsuRate();
        if (!marketSummary) {
            return bot.sendMessage(storedChatId, 'Sorry, I could not fetch the market data at the moment.');
        }

        const message = `
<b>📊 Market Summary for Today:</b>

<b>💹 Crypto Prices:</b>
- Bitcoin: $${marketSummary.crypto.bitcoin.usd.toLocaleString()} (${marketSummary.crypto.bitcoin.usd_24h_change.toFixed(2)}%)
- Solana: $${marketSummary.crypto.solana.usd.toLocaleString()} (${marketSummary.crypto.solana.usd_24h_change.toFixed(2)}%)

<b>💱 Black Market Naira to Dollar Rate:</b>
- Buy: ₦${marketSummary.nairatoDollar[0].price_buy.toLocaleString()}
- Sell: ₦${marketSummary.nairatoDollar[0].price_sell.toLocaleString()}

<b>📈 Top Advancers:</b>
${marketSummary.stocks.topAdvancers.map(stock => `- ${stock.SYMBOL}: ${stock.PERCENTAGE_CHANGE}%`).join('\n')}

<b>📉 Top Losers:</b>
${marketSummary.stocks.topLosers.map(stock => `- ${stock.SYMBOL}: ${stock.PERCENTAGE_CHANGE}%`).join('\n')}

<b>💰 Top Trades: By Value Traded </b>
${marketSummary.stocks.topTrades.map(stock => `- ${stock.Symbol}: ₦${stock.value.toLocaleString()}`).join('\n')}

<b>⭐ Micah's 2025 Stock Picks:</b>
${marketSummary.stockPicks.map(stock => `- ${stock.Symbol}: ₦${stock.ClosePrice} (${stock.PercChange}%)`).join('\n')}

<b>⭐ Remember to Invest Wisely, Ndewo! </b>
`;
        bot.sendMessage(storedChatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        logger.error(`Error sending market summary: ${error.message}`, { stack: error.stack });
    }
};

sendMarketSummary();
