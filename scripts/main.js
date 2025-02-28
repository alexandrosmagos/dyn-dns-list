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
            console.log(`✅ Found system Chromium at: ${path}`);
            return path;
        }
    }

    console.warn("⚠️ No system Chromium found. Using Puppeteer's bundled Chromium.");
    return null;
}

(async () => {
    process.env.PUPPETEER_DEBUG = "1"; // Enable debugging

    const startTime = new Date();
    const isLinux = os.platform() === "linux";
    const executablePath = isLinux ? await getChromiumExecutablePath() : undefined;
    let browser;

    try {
        console.log("🚀 Launching Puppeteer...");
        console.log(`🔹 OS: ${os.platform()}`);
        console.log(`🔹 Using Chromium path: ${executablePath || "Puppeteer's default"}`);

        const launchArgs = [
            "--window-size=1920,1080",
            ...(isLinux ? ["--disable-setuid-sandbox"] : []), // No need for --no-sandbox unless required
        ];

        console.log(`🔹 Puppeteer launch args: ${launchArgs.join(" ")}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: executablePath || undefined, // Use Puppeteer's default if system Chromium is unavailable
            args: launchArgs,
        });

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
