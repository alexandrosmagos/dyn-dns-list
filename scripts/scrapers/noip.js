require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");

const username = process.env.NOIP_USERNAME;
const password = process.env.NOIP_PASSWORD;

let data = [];
const filePath = path.join(__dirname, "..", "data", "noip.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		data = [];
	}
}

async function scrapeOptions(browser) {
	const page = await browser.newPage();
	await page.goto("https://www.noip.com/login");

	await page.type("#username", username);
	await page.type("#password", password);
	await page.keyboard.press("Enter");

	await page.waitForNavigation({ waitUntil: "networkidle0" });

	await page.goto("https://my.noip.com/dynamic-dns");

	console.log(await page.content());

	await page.waitForSelector("#app_config", { timeout: 15000 });

	const domains = await page.evaluate(() => {
		const appConfigScript = document.querySelector("#app_config").textContent;
		const config = JSON.parse(appConfigScript);
		return config.domains;
	});

	await page.close();

	let newDomains = 0;
	Object.keys(domains).forEach(type => {
		domains[type].forEach(domain => {
			if (!data.some(entry => entry.domain === domain)) {
				data.push({
					domain: domain,
					type: type,
					retrievedAt: new Date().toISOString(),
				});
				newDomains++;
			}
		});
	});

	console.log(`Added ${newDomains} new domains from https://my.noip.com`);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function scrape(browser) {
	await loadData();
	await scrapeOptions(browser);
}

module.exports = { scrape };