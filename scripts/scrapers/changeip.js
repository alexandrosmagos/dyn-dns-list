const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

let data = [];
const filePath = path.join(__dirname, '..', 'data', 'changeip.json');

async function loadData() {
    try {
        let fileData = await fs.readFile(filePath);
        data = JSON.parse(fileData);
    } catch (err) {
        data = [];
    }
}

async function scrapeOptions(browser) {
    const page = await browser.newPage();

    // Add to cart
    await page.goto('https://www.changeip.com/accounts/cart.php?a=add&bid=1');

    // View Domains
    await page.goto('https://www.changeip.com/accounts/cart.php?a=confproduct&i=0');

    const options = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#free-domain option')).map(option => ({
            id: option.value,
            domain: option.textContent.trim()
        }));
    });

    await page.close();

    let newDomains = 0;
    for (const option of options) {
        const exists = data.some(entry => entry.id === option.id);
        if (!exists) {
            data.push({
                id: option.id,
                domain: option.domain,
                retrievedAt: new Date().toISOString()
            });
            newDomains++;
        }
    }

    console.log(`Added ${newDomains} new domains from https://www.changeip.com`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function scrape(browser) {
    await loadData();
    await scrapeOptions(browser);
}

module.exports = { scrape };