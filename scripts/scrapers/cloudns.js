require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "Data", "cloudns.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		// console.log('No existing file found, starting fresh.');
		data = [];
	}
}

async function loginAndScrapeDomains() {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto("https://www.cloudns.net/index/show/login/");

	const usernameInput = await page.waitForSelector('xpath/.//*[@id="login2FAMail"]');
	await usernameInput.type(process.env.clouddns_USERNAME);

	const passwordInput = await page.waitForSelector('xpath/.//*[@id="login2FAPassword"]');
	await passwordInput.type(process.env.clouddns_PASSWORD);

	// wait 15 seconds for user to complete captcha
	await new Promise((resolve) => {
		setTimeout(resolve, 15000);
	});

	await passwordInput.focus();

	await page.keyboard.press("Enter");

	await page.waitForNavigation();

	// Navigate to the page with the select box
	await page.goto("https://www.cloudns.net/ajaxPages.php?action=newzone&show=freeZone");

	const domains = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("#freeDomain option")).map((option) => option.textContent.trim());
	});

	let newDomains = 0;

	for (const domain of domains) {
		const exists = data.some((entry) => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://cloudns.net`);
	await browser.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch((err) => console.log(err));
}

function scrape() {
    return new Promise((resolve, reject) => {
        loadData()
            .then(() => {
                loginAndScrapeDomains()
                    .then(resolve)   // resolve the promise when loginAndScrapeDomains is done
                    .catch(reject);  // if there's an error, pass it to the main promise
            })
            .catch(reject); // if there's an error, pass it to the main promise
    });
}

module.exports = { scrape };
