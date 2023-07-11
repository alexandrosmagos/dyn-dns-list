const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

let data = [];
const filePath = path.join(__dirname, '..', 'Data', 'changeip.json');

async function loadData() {
    try {
        let fileData = await fs.readFile(filePath);
        data = JSON.parse(fileData);
    } catch (err) {
        // console.log('No existing file found, starting fresh.');
        data = [];
    }
}

async function scrapeOptions() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Add to card
    await page.goto('https://www.changeip.com/accounts/cart.php?a=add&bid=1');

    // View Domains
    await page.goto('https://www.changeip.com/accounts/cart.php?a=confproduct&i=0');

    const options = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#free-domain option')).map(option => ({
            id: option.value,
            domain: option.textContent.trim()
        }));
    });

    await browser.close();

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

    console.log(`Added ${newDomains} new domains from https://www.changeip.com/`);

    fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch(err => console.log(err));
}

function scrape() {
    return new Promise((resolve, reject) => {
        loadData()
            .then(() => {
                scrapeOptions()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject); 
    });
}


module.exports = { scrape };