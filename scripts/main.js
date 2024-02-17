const puppeteer = require('puppeteer');
const os = require('os');
const afraid = require('./scrapers/afraid.js');
const changeip = require('./scrapers/changeip.js');
const cloudns = require('./scrapers/cloudns.js');
const dnsexit = require('./scrapers/dnsexit.js');
const duiadns = require('./scrapers/duiadns');
const dyn = require('./scrapers/dyn.js');
const dynv6 = require('./scrapers/dynv6.js');
const gslb = require('./scrapers/gslb.js');
const noip = require('./scrapers/noip.js');
const nowdns = require('./scrapers/now-dns.js');
const pubyun = require('./scrapers/pubyun.js');
const dynu = require('./scrapers/dynu.js');

const csv = require('./csv');

async function runScrapers() {
    const startTime = new Date();
    const isLinux = os.platform() === "linux";
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: isLinux ? "/usr/bin/chromium-browser" : undefined,
        });

        const scrapers = [
            afraid.scrape(browser),
            cloudns.scrape(browser),
            changeip.scrape(browser),
            dynv6.scrape(browser),
            gslb.scrape(browser),
            noip.scrape(browser),
            dynu.scrape(),
            dnsexit.scrape(),
            duiadns.scrape(),
            dyn.scrape(),
            nowdns.scrape(),
            pubyun.scrape()
        ];

        await Promise.all(scrapers);
        await csv.start();
    } catch (error) {
        console.error('There was an error running the scrapers:', error);
    } finally {
        await browser.close();
        const endTime = new Date();
        const timeTaken = (endTime - startTime) / (1000 * 60); // Convert milliseconds to minutes
        console.log(`The script took ${timeTaken} minutes to complete.`);
    }
}

runScrapers();