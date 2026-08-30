const os = require("os");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const { pathToFileURL } = require("url");
const csv = require("./csv");
const { updateCounts, retryWithBackoff } = require("./scraperUtils");

async function importScrapers() {
    const scrapersDir = path.join(__dirname, "scrapers");
    const scraperFiles = fs.readdirSync(scrapersDir).filter(file => file.endsWith(".js"));

    const scrapers = [];
    for (const file of scraperFiles) {
        const scraperPath = path.join(scrapersDir, file);
        const fileURL = pathToFileURL(scraperPath);
        const scraperModule = await import(fileURL.href);
        scrapers.push(scraperModule);
    }
    return scrapers;
}

async function launchBrowser() {
    const executablePath = await puppeteer.executablePath();
    console.log(`✅ Using Puppeteer's bundled Chrome: ${executablePath}`);

    const args = [
        "--window-size=1920,1080",
        "--disable-dev-shm-usage"
    ];

    // GitHub-hosted Linux runners execute Chrome in an environment where the
    // sandbox is not usable. Keep sandboxing enabled for normal local runs.
    if (process.env.GITHUB_ACTIONS === "true") {
        args.push("--no-sandbox", "--disable-setuid-sandbox");
    }

    try {
        return await puppeteer.launch({
            headless: true,
            executablePath,
            args
        });
    } catch (error) {
        if (args.includes("--no-sandbox")) throw error;

        console.warn("⚠️ Chrome failed with sandboxing enabled. Retrying with --no-sandbox...");
        return puppeteer.launch({
            headless: true,
            executablePath,
            args: [...args, "--no-sandbox", "--disable-setuid-sandbox"]
        });
    }
}

(async () => {
    const startTime = new Date();
    let browser;

    try {
        console.log("🚀 Launching Puppeteer...");
        console.log(`🔹 OS: ${os.platform()}`);

        browser = await launchBrowser();
        console.log("✅ Puppeteer launched successfully!");

        const scrapers = await importScrapers();
        const scraperPromises = scrapers.map(async scraper => {
            try {
                return await retryWithBackoff(() => scraper.scrape(browser));
            } catch (error) {
                console.error("❌ Scraper failed after all retries:", error.message);
                return null;
            }
        });

        await Promise.all(scraperPromises);
        await csv.start();
        await updateCounts();
    } catch (error) {
        console.error("❌ Error running the scrapers:", error);
        process.exitCode = 1;
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
