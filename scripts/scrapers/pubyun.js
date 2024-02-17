const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "data", "pubyun.json");

async function loadData() {
	try {
		let fileData = await fs.readFile(filePath);
		data = JSON.parse(fileData);
	} catch (err) {
		data = [];
	}
}

async function scrapeDomains() {
	const response = await fetch("https://www.pubyun.com/products/dyndns/product/");
	const body = await response.text();

	const $ = cheerio.load(body);
	const text = $("dl.dynamicDNSExp > dd:nth-child(4)").text();
	const regex = /\b([a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,})\b/gi;
	const foundDomains = text.match(regex);

	let newDomains = 0;

	for (const domain of foundDomains) {
		const exists = data.some(entry => entry.domain === domain);

		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	}

	console.log(`Added ${newDomains} new domains from https://www.pubyun.com`);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function scrape() {
	await loadData();
	await scrapeDomains();
}

module.exports = { scrape };