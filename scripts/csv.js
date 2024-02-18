const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const dataPath = path.join(__dirname, 'data');
const csvFilePath = path.join(__dirname, '..', 'links.csv');

const files = fs.readdirSync(dataPath).filter(file => file.endsWith('.json'));

// Initialize CSV writer with no append mode to overwrite the file for a clean start
const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'retrievedAt', title: 'RetrievedAt'},
        {id: 'provider', title: 'Provider'}
    ],
    append: false
});

async function writeCsv(data) {
    await csvWriter.writeRecords(data)
        .catch(err => console.error(`Failed to write CSV: ${err}`));
}

async function start() {
    console.log('Writing CSV files...');

    // Ensure we start with a fresh CSV file
    if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
    }

    for (let file of files) {
        const provider = path.basename(file, '.json');
        const filePath = path.join(dataPath, file);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);

        console.log(`${provider}: ${data.length} domains`);

        const csvData = data.map(entry => ({
            domain: entry.domain,
            retrievedAt: entry.retrievedAt,
            provider: provider
        }));

        await writeCsv(csvData);
    }

    console.log('Done!');
}

module.exports = { start };