const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

let domainData = [];
let newDomains = 0;
let pageNumber = 1;
let browser;

const filePath = path.join(__dirname, '..', 'Data', 'afraid.json');

async function initializeBrowser() {
    browser = await puppeteer.launch({
        headless: "new"
    });
}

async function navigatePage(url) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.goto(url, { waitUntil: 'networkidle2' });
    let body = await page.content();
    await page.close();
    return body;
}

async function scrapePage(pageNumber) {
    // if (pageNumber === 22) return;
    let url = pageNumber === 1 ? `http://freedns.afraid.org/domain/registry/` : `http://freedns.afraid.org/domain/registry/page-${pageNumber}.html`;

    if (pageNumber === 1 || pageNumber % 10 === 0) console.log(`Scraping page ${pageNumber} from https://afraid.org...`);
    let body = await navigatePage(url);

    let $ = cheerio.load(body);
    let tableRows = $('tr.trd, tr.trl');

    let validDataFound = false;

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
                if (existingDomain) {
                    if (existingDomain.age !== age) {
                        existingDomain.age = age; // update age if different
                    }
                } else {
                    let data = {
                        id: id,
                        domain: domain,
                        age: age,
                        retrievedAt: retrievedAt
                    };
                    domainData.push(data);
                    newDomains++;
                }
                validDataFound = true;
            }
        }
    });

    if (validDataFound) {
        // await new Promise(resolve => setTimeout(resolve, 1000));
        await scrapePage(pageNumber + 1);
    } else {
        console.log(`Reached the last page ${pageNumber}, stopping...`);
    }
}

function scrape() {
    return new Promise((resolve, reject) => {
        initializeBrowser()
            .then(() => {
                scrapePage(pageNumber)
                    .then(() => {
                        browser.close();
                        fs.writeFile(filePath, JSON.stringify(domainData, null, 2))
                            .then(() => {
                                console.log(`Added ${newDomains} new domains from http://afraid.org`); // log the new domains count
                                resolve();
                            })
                            .catch(reject);
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { scrape };
