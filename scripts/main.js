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

(async () => {
    process.env.PUPPETEER_DEBUG = "1"; // Enable debugging
    const startTime = new Date();
    let browser;

    try {
        console.log("🚀 Launching Puppeteer...");
        console.log(`🔹 OS: ${os.platform()}`);

        const launchArgs = [
            "--window-size=1920,1080",
            "--disable-dev-shm-usage", // Fix crashes in Docker and Linux
            "--disable-setuid-sandbox", // Needed for non-root execution
        ];

        // If on Linux, force Puppeteer's Chromium
        const browserFetcher = puppeteer.createBrowserFetcher();
        const revisionInfo = await browserFetcher.download("latest");
        console.log(`✅ Using Puppeteer’s bundled Chromium: ${revisionInfo.executablePath}`);

        // Final fallback: If system Chromium fails, use --no-sandbox
        try {
            browser = await puppeteer.launch({
                headless: "new",
                executablePath: revisionInfo.executablePath, // Use Puppeteer's Chromium
                args: launchArgs,
            });
        } catch (err) {
            console.warn("⚠️ Puppeteer failed without sandbox. Retrying with --no-sandbox...");
            launchArgs.push("--no-sandbox"); // Absolute last resort
            browser = await puppeteer.launch({
                headless: "new",
                executablePath: revisionInfo.executablePath,
                args: launchArgs,
            });
        }

        console.log("✅ Puppeteer launched successfully!");

        const scrapers = await importScrapers();
        const scraperPromises = scrapers.map((scraper) => scraper.scrape(browser));

        await Promise.all(scraperPromises);
        await csv.start();
        await updateCounts();
    } catch (error) {
        console.error("❌ Error running the scrapers:", error);
    } finally {
        if (browser) {
            console.log("🛑 Closing browser...");
            await browser.close();
        } else {
            console.warn("⚠️ Browser was never launched!");
        }
        const endTime = new Date();
        const timeTaken = (endTime - startTime) / (1000 * 60);
        console.log(`⏳ The script took ${timeTaken.toFixed(2)} minutes to complete.`);
    }
})();
