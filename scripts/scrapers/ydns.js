const cheerio = require('cheerio');
const path = require('path');
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "ydns.io.json");

async function fetchAndParseDomains() {
    const response = await fetchWithRetry("https://ydns.io/domains/");
    const body = await response.text();
    const $ = cheerio.load(body);
    const domains = [];

    $("table.table tbody tr").each((_, element) => {
        const domain = $(element).find("td:first-child a").text().trim();
        if (domain) {
            domains.push({
                domain: domain,
                retrievedAt: new Date().toISOString(),
            });
        }
    });

    return domains;
}

async function scrape() {
    try {
        console.log("🚀 Starting ydns.io scraper...");
        const data = await loadData(filePath);
        
        const newDomains = await fetchAndParseDomains();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://ydns.io`);
        } else {
            console.log(`ℹ️ No new domains found from https://ydns.io`);
        }
        
        console.log(`📊 Total domains from ydns.io: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in ydns.io scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };