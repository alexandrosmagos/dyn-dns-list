const cheerio = require('cheerio');
const path = require('path');
const { loadData, saveDomains, fetchWithRetry } = require('../scraperUtils');

const filePath = path.join(__dirname, '..', 'data', 'noip.com.json');

async function fetchAndParseDomains() {
    try {
        const response = await fetchWithRetry('https://www.noip.com/support/faq/frequently-asked-questions');
        const body = await response.text();
        const $ = cheerio.load(body);
        const article = $('#post-450');
        const domains = [];

        Object.entries({
            'Free Domains:': 'free',
            'Enhanced Domains:': 'enhanced'
        }).forEach(([sectionTitle, type]) => {
            article.find(`h2:contains('${sectionTitle}')`).next('p').html()?.split('<br>').forEach(domainHtml => {
                const domainText = cheerio.load(domainHtml).text().trim();
                if (domainText) {
                    domains.push({
                        domain: domainText,
                        type: type,
                        retrievedAt: new Date().toISOString()
                    });
                }
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
        console.log("🚀 Starting noip.com scraper...");
        let data = await loadData(filePath);
        
        const newDomains = await fetchAndParseDomains();
        const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain && d.type === nd.type));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://noip.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://noip.com`);
        }
        
        console.log(`📊 Total domains from noip.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in noip.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };