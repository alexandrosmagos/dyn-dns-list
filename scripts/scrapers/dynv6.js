const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "Data", "dynv6.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		// console.log("No existing file found, starting fresh.");
		data = [];
	}
}

async function scrapeDomains() {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();
	await page.goto("https://dynv6.com/");

	const options = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("#domain option")).map((option) => option.textContent.trim());
	});

	let newDomains = 0;

	for (const domain of options) {
		if (domain === "delegate your own domain …") continue;
		const exists = data.some((entry) => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://dynv6.com/`);
	await browser.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch((err) => console.log(err));
}

function scrape() {
    return new Promise((resolve, reject) => {
        loadData()
            .then(() => {
                scrapeDomains()
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

module.exports = { scrape };

