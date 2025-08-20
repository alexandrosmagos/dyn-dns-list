const cheerio = require("cheerio");
const path = require("path");
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "dnsexit.com.json");

async function scrapeOptions() {
    try {
        const response = await fetchWithRetry("http://dnsexit.com/domains/free-second-level-domains/");
        const body = await response.text();
        const $ = cheerio.load(body);
        const options = $("#iddomain > option");
        const domains = [];

        options.each((_, element) => {
            const domain = $(element).text().trim();
            domains.push({
                domain: domain,
                retrievedAt: new Date().toISOString(),
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
        console.log("🚀 Starting dnsexit.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await scrapeOptions();

        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from http://dnsexit.com`);
        } else {
            console.log(`ℹ️ No new domains found from http://dnsexit.com`);
        }
        
        console.log(`📊 Total domains from dnsexit.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in dnsexit.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };