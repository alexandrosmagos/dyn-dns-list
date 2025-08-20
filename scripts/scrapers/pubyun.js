const cheerio = require("cheerio");
const path = require("path");
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "pubyun.com.json");

async function scrapeDomains() {
    try {
        const response = await fetchWithRetry("https://www.pubyun.com/products/dyndns/product/");
        const body = await response.text();
        const $ = cheerio.load(body);
        const text = $("dl.dynamicDNSExp > dd:nth-child(4)").text();
        const regex = /\b([a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,})\b/gi;
        const foundDomains = text.match(regex) || [];
        const domains = foundDomains.map(domain => ({
            domain: domain,
            retrievedAt: new Date().toISOString(),
        }));

        return domains;
    } catch (error) {
        console.error('Error fetching or parsing domains:', error);
        throw error;
    }
}

async function scrape() {
    try {
        console.log("🚀 Starting pubyun.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await scrapeDomains();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));

        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://pubyun.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://pubyun.com`);
        }
        
        console.log(`📊 Total domains from pubyun.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in pubyun.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };