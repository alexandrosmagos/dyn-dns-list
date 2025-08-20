const cheerio = require('cheerio');
const path = require('path');
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, '..', 'data', 'dynu.com.json');

async function fetchAndParseDomains() {
    try {
        const response = await fetchWithRetry('https://www.dynu.com/en-US/ControlPanel/AddDDNS');
        const body = await response.text();
        const $ = cheerio.load(body);
        const domains = [];

        $('#Container option').each((_, element) => {
            let domainText = $(element).text();

            domainText = domainText.replace(" - Members only", "");

            domains.push({
                domain: domainText,
                retrievedAt: new Date().toISOString()
            });
        });

        return domains;
    } catch (error) {
        console.error('Error fetching or parsing domains:', error);
        throw error;
    }
}

async function scrape() {
    try {
        console.log("🚀 Starting dynu.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await fetchAndParseDomains();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://www.dynu.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://www.dynu.com`);
        }
        
        console.log(`📊 Total domains from dynu.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in dynu.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };