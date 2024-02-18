const os = require("os");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const { pathToFileURL } = require("url");
const csv = require("./csv");
const { updateCounts } = require("./scraperUtils");

async function importScrapers() {
    const scrapersDir = path.join(__dirname, "scrapers");
    const scraperFiles = fs
        .readdirSync(scrapersDir)
        .filter((file) => file.endsWith(".js"));

    const scrapers = [];
    for (const file of scraperFiles) {
        const scraperPath = path.join(scrapersDir, file);
        const fileURL = pathToFileURL(scraperPath);
        const scraperModule = await import(fileURL.href);
        scrapers.push(scraperModule);
    }
    return scrapers;
}

async function getChromiumExecutablePath() {
    const linuxPaths = [
        "/usr/bin/chromium-browser", // Common in Ubuntu, Debian
        "/usr/bin/chromium", // Common in Arch Linux, Fedora
    ];

    for (const path of linuxPaths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }

    throw new Error("Chromium executable not found in expected paths");
}

(async () => {
    const startTime = new Date();
    const isLinux = os.platform() === "linux";
    const executablePath = isLinux ? await getChromiumExecutablePath() : undefined;
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: executablePath,
            args: ["--window-size=1920,1080"], // Makes the scraping easier as some websites hide elements on smaller screens
        });

        const scrapers = await importScrapers();
        const scraperPromises = scrapers.map((scraper) => scraper.scrape(browser));

        await Promise.all(scraperPromises);
        await csv.start();
        await updateCounts();
    } catch (error) {
        console.error("There was an error running the scrapers:", error);
    } finally {
        await browser.close();
        const endTime = new Date();
        const timeTaken = (endTime - startTime) / (1000 * 60);
        console.log(`The script took ${timeTaken} minutes to complete.`);
    }
})();