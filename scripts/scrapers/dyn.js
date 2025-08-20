const cheerio = require('cheerio');
const path = require('path');
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, '..', 'data', 'dyn.com.json');

async function scrapeOptions() {
    try {
        const response = await fetchWithRetry('https://account.dyn.com/');
        const body = await response.text();
        const $ = cheerio.load(body);
        const options = $('#hostname-search > select > option');
        const domains = [];

        options.each((_, element) => {
            const domain = $(element).attr('value');
            if (domain) {
                domains.push({
                    domain: domain,
                    retrievedAt: new Date().toISOString()
                });
            }
        });

        return domains;
    } catch (error) {
        console.error('Error fetching or parsing domains:', error);
        throw error;
    }
}

async function scrape() {
    try {
        console.log("🚀 Starting dyn.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await scrapeOptions();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));

        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://dyn.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://dyn.com`);
        }
        
        console.log(`📊 Total domains from dyn.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in dyn.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };