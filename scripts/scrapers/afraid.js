const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

let domainData = [];
let newDomains = 0;
const filePath = path.join(__dirname, '..', 'data', 'afraid.json');

async function navigatePage(browser, url) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const body = await page.content();
        await page.close();
        return body;
    } catch (err) {
        console.error(`Failed to load page ${url}: ${err}`);
        await page.close();
        throw err;
    }
}

async function scrapePage(browser, pageNumber) {
    let url = pageNumber === 1 ? `http://freedns.afraid.org/domain/registry/` : `http://freedns.afraid.org/domain/registry/page-${pageNumber}.html`;

    if (pageNumber === 1 || pageNumber % 50 === 0) {
        console.log(`Scraping page ${pageNumber} from https://afraid.org...`);
    }
    let body = await navigatePage(browser, url);

    let $ = cheerio.load(body);
    let title = $('title').text();
    let match = title.match(/Page \d+ of (\d+)/);
    let totalPages = match ? parseInt(match[1], 10) : pageNumber;

    let tableRows = $('tr.trd, tr.trl');

    tableRows.each((index, row) => {
        let columns = $(row).find('td');
        if (columns.length === 4) {
            let domainIdUrl = $(columns[0]).find('a:first').attr('href');
            let id = domainIdUrl ? domainIdUrl.split('=')[1] : null;
            let domain = $(columns[0]).find('a:first').text();
            let age = $(columns[3]).text();
            let retrievedAt = new Date().toISOString();

            if (id && !domain.includes("Next page") && !age.includes("Next page")) {
                let existingDomain = domainData.find(data => data.id === id);
                if (!existingDomain) {
                    domainData.push({ id, domain, age, retrievedAt });
                    newDomains++;
                }
            }
        }
    });

    if (pageNumber < totalPages) {
        await scrapePage(browser, pageNumber + 1);
    } else {
        console.log(`Reached the end, total pages: ${totalPages}, stopping...`);
    }
}

async function scrape(browser) {
    try {
        await scrapePage(browser, 1);
        await fs.writeFile(filePath, JSON.stringify(domainData, null, 2));
        console.log(`Added ${newDomains} new domains from http://afraid.org`);
    } catch (error) {
        console.error('An error occurred during the scraping process:', error);
    }
}

module.exports = { scrape };