require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

const username = process.env.NOIP_USERNAME;
const password = process.env.NOIP_PASSWORD;

let data = [];
const filePath = path.join(__dirname, "..", "Data", "noip.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		// console.log("No existing file found, starting fresh.");
		data = [];
	}
}

async function scrapeOptions() {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();
	await page.goto("https://www.noip.com/login");

	await page.type("#username", username);
	await page.type("#password", password);
	await page.keyboard.press("Enter");

	await page.waitForNavigation({ waitUntil: "load" });

	await page.goto("https://my.noip.com/dynamic-dns");

	// Get the domain options
	const domains = await page.evaluate(() => {
		const configScript = document.querySelector("#app_config").textContent;
		const config = JSON.parse(configScript);
		return {
			free: config.domains.free,
			enhanced: config.domains.enhanced,
			retrievedAt: new Date().toISOString(),
		};
	});

	await browser.close();

	let newDomains = 0;

	for (const type in domains) {
		for (const domain of domains[type]) {
			if (domain.length < 2) continue;
			const exists = data.some((entry) => entry.domain === domain);
			if (!exists) {
				data.push({
					domain: domain,
					type: type,
					retrievedAt: domains.retrievedAt,
				});
				newDomains++;
			}
		}
	}

	console.log(`Added ${newDomains} new domains from https://my.noip.com`);

	fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch((err) => console.log(err));
}

function scrape() {
    return new Promise((resolve, reject) => {
        loadData()
            .then(() => {
                scrapeOptions()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { scrape };
