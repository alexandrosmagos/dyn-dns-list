const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const dataPath = path.join(__dirname, 'data');

const files = fs.readdirSync(dataPath).filter(file => file.endsWith('.json'));

const csvWriter = createCsvWriter({
    path: path.join(__dirname, '..', 'links.csv'),
    header: [
        { id: 'domain', title: 'Domain' },
        { id: 'retrievedAt', title: 'RetrievedAt' },
        { id: 'provider', title: 'Provider' }
    ],
    append: true
});

// Create write stream for links.txt
const txtWriter = fs.createWriteStream(path.join(__dirname, '..', 'links.txt'), { flags: 'a' });

function start() {
    files.forEach(file => {
        const provider = path.basename(file, '.json');
        const filePath = path.join(dataPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const csvData = data.map(entry => ({
            domain: entry.domain,
            retrievedAt: entry.retrievedAt,
            provider: provider
        }));

        // Write domains to links.txt
        data.forEach(entry => txtWriter.write(`${entry.domain}\n`));

        csvWriter
            .writeRecords(csvData)
            // .then(() => console.log(`The CSV file for ${provider} was written successfully`))
            .catch(err => console.error(`Failed to write CSV for ${provider}: ${err}`));
    });

    txtWriter.end();
    
    console.log('Done!');
}

module.exports = { start };
