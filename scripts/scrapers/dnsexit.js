const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "Data", "dnsexit.json");

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
	const response = await fetch("http://dnsexit.com/domains/free-second-level-domains/");
	const body = await response.text();

	const $ = cheerio.load(body);
	const options = $("#iddomain > option");

	let newDomains = 0;

	options.each((index, element) => {
		const domain = $(element).text().trim();
		const exists = data.some((entry) => entry.domain === domain);

		if (!exists) {
			data.push({
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	});

	console.log(`Added ${newDomains} new domains from http://dnsexit.com`);

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