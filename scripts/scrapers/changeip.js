const fs = require('fs').promises;
const path = require('path');
const { loadData, saveDomains } = require('../scraperUtils');

const filePath = path.join(__dirname, '..', 'data', 'changeip.com.json');

async function scrapeOptions(browser) {
    const page = await browser.newPage();
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("🔍 Navigating to changeip.com cart page...");
        await page.goto('https://www.changeip.com/accounts/cart.php?a=add&bid=1', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log("🔍 Navigating to changeip.com domains page...");
        await page.goto('https://www.changeip.com/accounts/cart.php?a=confproduct&i=0', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const options = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#free-domain option')).map(option => ({
                id: option.value,
                domain: option.textContent.trim()
            }));
        });

        return options;
    } catch (error) {
        console.error(`❌ Error scraping changeip.com options: ${error.message}`);
        throw error;
    } finally {
        await page.close();
    }
}

async function scrape(browser) {
    try {
        console.log("🚀 Starting changeip.com scraper...");
        let data = await loadData(filePath);
        
        const options = await scrapeOptions(browser);

        let uniqueNewDomains = [];
        for (const option of options) {
            const exists = data.some(entry => entry.id === option.id);
            if (!exists) {
                uniqueNewDomains.push({
                    id: option.id,
                    domain: option.domain,
                    retrievedAt: new Date().toISOString()
                });
            }
        }

        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...data, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domains from https://changeip.com`);
        } else {
            console.log(`ℹ️ No new domains found from https://changeip.com`);
        }
        
        console.log(`📊 Total domains from changeip.com: ${data.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in changeip.com scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };