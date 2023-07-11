require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "Data", "gslb.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		// console.log("No existing file found, starting fresh.");
		data = [];
	}
}

async function loginAndScrapeDomains() {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();
	await page.goto("https://gui.gslb.me/GSLB.ME-GUI/");

	// Wait for the inputs to load
	await page.waitForSelector("tbody input");

	// Fill in the login form
	await page.type('tbody input[type="text"]:first-child', process.env.gslb_USERNAME);
	await page.type('tbody input[type="password"]', process.env.gslb_PASSWORD);

	await page.keyboard.press("Enter");

	await page.waitForNavigation();

	await new Promise(resolve => setTimeout(resolve, 1500));

	const domains = await page.evaluate(() => {
		return Array.from(document.querySelectorAll(".v-tree-node-caption > div > span")).map((span) => span.textContent.trim());
	});

	let newDomains = 0;

	for (const domain of domains) {
		const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,})\b/gi;

		if (!domainRegex.test(domain)) continue;
		if (domain.includes("[")) continue;

		const exists = data.some((entry) => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://gui.gslb.me`);
	await browser.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch((err) => console.log(err));
}

function scrape() {
    return new Promise((resolve, reject) => {
        loadData()
            .then(() => {
                loginAndScrapeDomains()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { scrape };
