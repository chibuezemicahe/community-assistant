const axios = require('axios');
const marketSummary={

    crypto:{},
    nairatoDollar:{},
    stocks:{
        topAdvancers:{},
        topLosers:{},
        topTrades:{}
    },
    stockPicks:{}
};




const fetchCsuRate = async () => {
    try {
        

        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=usd,ngn&include_24hr_change=true');
        marketSummary.crypto = response.data;

        const topAdvancers = await axios.get('https://doclib.ngxgroup.com/REST/api/mrkstat/topsymbols');
        const bottomLosers = await axios.get('https://doclib.ngxgroup.com/REST/api/mrkstat/bottomsymbols');
        const topTraded = await axios.get('https://doclib.ngxgroup.com/REST/api/mrkstat/toptrades');
       
        marketSummary.stocks.topAdvancers = topAdvancers.data;
        marketSummary.stocks.topLosers = bottomLosers.data;
        marketSummary.stocks.topTrades = topTraded.data;
        
        // to be used for filtering the stock picks
        const stocksymbols = ['CUTIX','UACN','CILEASING','UNIVINSURE','STERLINGNG']

        const stockPicks = await axios.get('https://doclib.ngxgroup.com/REST/api/statistics/equities/?market=&sector=&orderby=&pageSize=300&pageNo=0');

        // Here i filter the stocks to get only the stocks that are in the stocksymbols array
        const findStockPicks = stockPicks.data.filter(stock => stocksymbols.includes(stock.Symbol));
        
        marketSummary.stockPicks = findStockPicks;


        const nairaToDollar = await axios.get('https://monierate.com/api/pairs/changers', {
            params: {
                pair_code: 'usdngn',
            }
        });

        const nairaToDollarRate = nairaToDollar.data.filter(exchanage => exchanage.changer_code === 'bybit');

        marketSummary.nairatoDollar = nairaToDollarRate;

        return marketSummary;

    } catch (error) {
        console.error('Error fetching stocks data:', error);
        return `Error fetching stocks data: ${error.message}`;
    }
}





module.exports = { fetchCsuRate };


// this link is for bottom lossers in the Ngx https://doclib.ngxgroup.com/REST/api/mrkstat/bottomsymbols
// this link is for top advancers in the Ngx https://doclib.ngxgroup.com/REST/api/mrkstat/topsymbols
//this link is for the top 5 trades in the Ngx https://doclib.ngxgroup.com/REST/api/mrkstat/toptrades
// Micah's Stock Picks Api link https://doclib.ngxgroup.com/REST/api/statistics/equities/?market=&sector=&orderby=&pageSize=300&pageNo=0


