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
		data = [];
	}
}

async function loginAndScrapeDomains(browser) {
	const page = await browser.newPage();
	await page.goto("https://www.cloudns.net/index/show/login/", { waitUntil: "networkidle0" });

	try {
		await page.waitForSelector('iframe[src*="hcaptcha.com"]', { timeout: 5000 });
		console.log("CAPTCHA found, stopping script.");
		return;
	} catch (error) {
		console.log("No CAPTCHA found, continuing...");
	}

	const usernameInput = await page.waitForSelector('xpath/.//*[@id="login2FAMail"]');
	await usernameInput.type(process.env.CLOUDDNS_USERNAME);

	const passwordInput = await page.waitForSelector('xpath/.//*[@id="login2FAPassword"]');
	await passwordInput.type(process.env.CLOUDDNS_PASSWORD);

	await passwordInput.focus();
	await page.keyboard.press("Enter");
	await page.waitForNavigation();

	await page.goto("https://www.cloudns.net/ajaxPages.php?action=newzone&show=freeZone");

	const domains = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("#freeDomain option")).map(option => option.textContent.trim());
	});

	let newDomains = 0;
	for (const domain of domains) {
		const exists = data.some(entry => entry.domain === domain);
		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://cloudns.net`);
	await page.close();
	await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function scrape(browser) {
	await loadData();
	await loginAndScrapeDomains(browser);
}

module.exports = { scrape };