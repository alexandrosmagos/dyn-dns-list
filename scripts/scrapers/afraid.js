const cheerio = require('cheerio');
const path = require('path');
const { loadData, saveDomains } = require('../scraperUtils');

const filePath = path.join(__dirname, '..', 'data', 'afraid.org.json');

async function navigatePage(page, url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Navigating to ${url} (attempt ${attempt}/${maxRetries})...`);
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 // 30 second timeout
            });
            return await page.content();
        } catch (err) {
            console.error(`❌ Failed to load page ${url} (attempt ${attempt}/${maxRetries}): ${err.message}`);
            
            if (attempt === maxRetries) {
                throw err;
            }
            
            const delay = 2000 * Math.pow(2, attempt - 1);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

let totalScrapePages = 2;

async function scrapePage(page, pageNumber) {
    let url = pageNumber === 1 ? `http://freedns.afraid.org/domain/registry/` : `http://freedns.afraid.org/domain/registry/page-${pageNumber}.html`;
    let body = await navigatePage(page, url);
    let $ = cheerio.load(body);

    if (pageNumber === 1) {
        let title = $('title').text();
        let match = title.match(/Page \d+ of (\d+)/);
        totalScrapePages = match ? parseInt(match[1], 10) : pageNumber;
    }

    console.log(`📄 Scraping page ${pageNumber}/${totalScrapePages} of https://afraid.org`);

    let newDomains = [];
    $('tr.trd, tr.trl').each((_, row) => {
        let domainIdUrl = $(row).find('td a:first').attr('href');
        let id = domainIdUrl ? domainIdUrl.split('=')[1] : null;
        let domain = $(row).find('td a:first').text().trim();
        let age = $(row).find('td').eq(3).text().trim();
        let retrievedAt = new Date().toISOString();

        newDomains.push({ id, domain, age, retrievedAt });
    });

    return newDomains;
}

async function scrape(browser) {
    try {
        console.log("🚀 Starting afraid.org scraper...");
        let existingDomains = await loadData(filePath);
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        let allNewDomains = [];

        for (let pageNumber = 1; pageNumber <= totalScrapePages; pageNumber++) {
            try {
                const pageDomains = await scrapePage(page, pageNumber);
                allNewDomains.push(...pageDomains);
            } catch (error) {
                console.error(`❌ Failed to scrape page ${pageNumber}: ${error.message}`);
                continue;
            }
        }

        await page.close();

        let uniqueNewDomains = allNewDomains.filter(nd => !existingDomains.some(d => d.id === nd.id));
        
        if (uniqueNewDomains.length > 0) {
            await saveDomains(filePath, [...existingDomains, ...uniqueNewDomains]);
            console.log(`✅ Added ${uniqueNewDomains.length} new domain(s) from https://afraid.org`);
        } else {
            console.log(`ℹ️ No new domains found from https://afraid.org`);
        }
        
        console.log(`📊 Total domains from afraid.org: ${existingDomains.length + uniqueNewDomains.length}`);
    } catch (error) {
        console.error(`❌ Error in afraid.org scraper: ${error.message}`);
        throw error;
    }
}

module.exports = { scrape };