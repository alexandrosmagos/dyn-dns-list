const cheerio = require("cheerio");
const path = require("path");
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "duiadns.net.json");

async function scrapeOptions() {
    try {
        const response = await fetchWithRetry("https://www.duiadns.net/register-personal");
        const body = await response.text();
        const $ = cheerio.load(body);
        const options = $('select[name="d_default"] > option');
        const domains = [];

        options.each((_, element) => {
            const domain = $(element).text().trim();

            if (domain !== "Domain") {
                domains.push({
                    domain: domain,
                    retrievedAt: new Date().toISOString(),
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
        console.log("🚀 Starting duiadns.net scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await scrapeOptions();

        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://duiadns.net`);
        } else {
            console.log(`ℹ️ No new domains found from https://duiadns.net`);
        }
        
        console.log(`📊 Total domains from duiadns.net: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in duiadns.net scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };