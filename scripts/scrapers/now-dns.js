const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const path = require("path");

let data = [];
const filePath = path.join(__dirname, "..", "data", "now-dns.json");

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
	const response = await fetch("https://now-dns.com/");
	const body = await response.text();

	const $ = cheerio.load(body);
	const options = $("#domainList > option");

	let newDomains = 0;

	options.each((index, element) => {
		const id = $(element).attr("value");
		const domain = $(element).text().trim().replace(/^\./, "");
		const exists = data.some((entry) => entry.id === id);

		if (!exists) {
			data.push({
				id: id,
				domain: domain,
				retrievedAt: new Date().toISOString(),
			});
			newDomains++;
		}
	});

	console.log(`Added ${newDomains} new domains from https://now-dns.com/`);

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
