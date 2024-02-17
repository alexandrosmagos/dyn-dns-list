const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "data", "dynv6.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		data = [];
	}
}


async function scrapeDomains(browser) {
	const page = await browser.newPage();
	await page.goto("https://dynv6.com/");

	const options = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("#domain option")).map(option => option.textContent.trim());
	});

	let newDomains = 0;

	for (const domain of options) {
		if (domain === "delegate your own domain …") continue;
		const exists = data.some(entry => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://dynv6.com/`);
	await page.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}


async function scrape(browser) {
	await loadData();
	await scrapeDomains(browser);
}

module.exports = { scrape };