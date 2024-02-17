const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

let data = [];
const filePath = path.join(__dirname, '..', 'data', 'dynu.json');

async function loadData() {
    try {
        const fileData = await fs.readFile(filePath);
        data = JSON.parse(fileData);
    } catch (err) {
        data = [];
    }
}

async function fetchAndParseDomains() {
    try {
        const response = await fetch('https://www.dynu.com/en-US/ControlPanel/AddDDNS');
        const body = await response.text();
        const $ = cheerio.load(body);
        const domains = [];

        $('#Container option').each((_, element) => {
            let domainText = $(element).text();
            
            domainText = domainText.replace(" - Members only", "");
            
            const isNewDomain = !data.some(entry => entry.domain === domainText);
            if (isNewDomain) {
                domains.push({
                    domain: domainText,
                    retrievedAt: new Date().toISOString()
                });
            }
        });

        console.log(`Added ${domains.length} new domains from https://dynu.com`);
        return domains;
    } catch (error) {
        console.error('Error fetching or parsing domains:', error);
        return [];
    }
}

async function saveDomains(newDomains) {
    if (newDomains.length > 0) {
        data = [...data, ...newDomains];
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving domains to file:', error);
        }
    }
}

async function scrape() {
    await loadData();
    const newDomains = await fetchAndParseDomains();
    await saveDomains(newDomains);
}

module.exports = { scrape };