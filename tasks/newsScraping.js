const Parser = require('rss-parser');
const cron = require('node-cron');
const { all } = require('axios');

const rssFeeds = [
    { url: 'https://nairametrics.com/feed/', category: 'Economy' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss', category: 'Markets' }
];

const parser = new Parser();

const fetchRss = async () => {
    const allItems = [];

    for (const feed of rssFeeds) {
        const feedData = await parser.parseURL(feed.url);
        const item = feedData.items.find(item => {
            if (feed.url.includes('nairametrics')) {
                return item.categories && item.categories.includes(feed.category);
            } else if (feed.url.includes('coindesk')) {
                return item.categories && item.categories.some(category => {
                    if (typeof category === 'string') {
                        return category.includes(feed.category);
                    } else if (category && category._) {
                        return category._.includes(feed.category);
                    }
                    return false;
                });
            }
            return false;
        });
        if (item) {
            allItems.push(item);
        }
    }

    if(allItems.length === 0) {
        console.log('No items found');
        return "No News For Today";
    }
    console.log(allItems);
    return allItems;
}

module.exports = { fetchRss };