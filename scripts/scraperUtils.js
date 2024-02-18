// scraperUtils.js
const fs = require('fs').promises;

async function loadData(filePath) {
    try {
        const fileData = await fs.readFile(filePath);
        return JSON.parse(fileData);
    } catch (err) {
        return []; // Return an empty array if the file doesn't exist or can't be read
    }
}

async function saveDomains(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving domains to file ${filePath}:`, error);
    }
}

module.exports = { loadData, saveDomains };