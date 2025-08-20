const cheerio = require("cheerio");
const path = require("path");
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "now-dns.com.json");

async function scrapeOptions() {
    try {
        const response = await fetchWithRetry("https://now-dns.com/");
        const body = await response.text();
        const $ = cheerio.load(body);
        const options = $("#domainList > option");
        const domains = [];

        options.each((_, element) => {
            const id = $(element).val();
            const domain = $(element).text().trim().replace(/^\./, "");
            domains.push({
                id: id,
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
        console.log("🚀 Starting now-dns.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await scrapeOptions();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.id === nd.id));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://now-dns.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://now-dns.com`);
        }
        
        console.log(`📊 Total domains from now-dns.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in now-dns.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };