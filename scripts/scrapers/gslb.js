require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "data", "gslb.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		data = [];
	}
}


async function loginAndScrapeDomains(browser) {
	const page = await browser.newPage();
	await page.goto("https://gui.gslb.me/GSLB.ME-GUI/");


	await page.waitForSelector("tbody input");

	// Fill in the login form
	await page.type('tbody input[type="text"]:first-child', process.env.GSLB_USERNAME);
	await page.type('tbody input[type="password"]', process.env.GSLB_PASSWORD);

	await page.keyboard.press("Enter");

	await page.waitForNavigation();

	await new Promise(resolve => setTimeout(resolve, 1500));

	const domains = await page.evaluate(() => {
		return Array.from(document.querySelectorAll(".v-tree-node-caption > div > span")).map(span => span.textContent.trim());
	});

	let newDomains = 0;

	for (const domain of domains) {
		const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,})\b/gi;

		if (!domainRegex.test(domain)) continue;
		if (domain.includes("[")) continue;

		const exists = data.some(entry => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://gui.gslb.me`);
	await page.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function scrape(browser) {
	await loadData();
	await loginAndScrapeDomains(browser);
}

module.exports = { scrape };