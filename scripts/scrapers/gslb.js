require("dotenv").config();
const puppeteer = require("puppeteer");
const path = require("path");
const { loadData, saveDomains } = require('../scraperUtils');

const filePath = path.join(__dirname, "..", "data", "gslb.json");

async function loginAndScrapeDomains(browser) {
	const page = await browser.newPage();
	await page.goto("https://gui.gslb.me/GSLB.ME-GUI/");
	await page.waitForSelector("tbody input");

	await page.type('tbody input[type="text"]:first-child', process.env.GSLB_USERNAME);
	await page.type('tbody input[type="password"]', process.env.GSLB_PASSWORD);
	await page.keyboard.press("Enter");
	await page.waitForNavigation();
	await new Promise(resolve => setTimeout(resolve, 1500));

	const domains = await page.evaluate(() =>
		Array.from(document.querySelectorAll(".v-tree-node-caption > div > span"), span => span.textContent.trim()).filter(domain => /\b([a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,})\b/gi.test(domain) && !domain.includes("[")));

	await page.close();
	return domains.map(domain => ({
		domain: domain,
		retrievedAt: new Date().toISOString(),
	}));
}

async function scrape(browser) {
	let data = await loadData(filePath);
	const newDomains = await loginAndScrapeDomains(browser);
	const uniqueNewDomains = newDomains.filter(nd => !data.some(d => d.domain === nd.domain));
	if (uniqueNewDomains.length > 0) await saveDomains(filePath, [...data, ...uniqueNewDomains]);

	console.log(`Added ${uniqueNewDomains.length} new domains from https://gslb.me`);
}

module.exports = { scrape };