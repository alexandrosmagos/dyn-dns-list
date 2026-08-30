const fs = require('fs').promises;
const path = require('path');
const { readCanonicalRecords } = require('./csv');

async function loadData(filePath) {
    try {
        const fileData = await fs.readFile(filePath);
        return JSON.parse(fileData);
    } catch (err) {
        return [];
    }
}

async function saveDomains(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving domains to file ${filePath}:`, error);
    }
}

async function updateCounts() {
    const dataPath = path.join(__dirname, 'data');
    const readmePath = path.join(__dirname, '..', 'README.md');
    try {
        const files = (await fs.readdir(dataPath)).filter(file => file.endsWith('.json')).sort();
        const providerCounts = [];
        for (const file of files) {
            const provider = file.replace('.json', '');
            const data = await loadData(path.join(dataPath, file));
            const count = new Set(data.map(entry => require('./csv').normalizeDomain(entry.domain)).filter(Boolean)).size;
            providerCounts.push({ provider, count });
        }
        const { records } = readCanonicalRecords();
        let readmeContent = await fs.readFile(readmePath, 'utf8');
        for (const { provider, count } of providerCounts) {
            const escaped = provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            readmeContent = readmeContent.replace(new RegExp(`(- \\[${escaped}\\]\\([^\\n]+\\) \\()\\d+( domains\\))`, 'g'), `$1${count}$2`);
        }
        readmeContent = readmeContent.replace(/# Dynamic DNS domain list \(\d{4}\) - \d+ domains/g, `# Dynamic DNS domain list (${new Date().getUTCFullYear()}) - ${records.length} domains`);
        const now = new Date();
        const stamp = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
        readmeContent = readmeContent.replace(/\*\*Domains Last Update: .+\*\*/g, `**Domains Last Update: ${stamp}**`);
        await fs.writeFile(readmePath, readmeContent);
        console.log('README.md updated with normalized unique-domain counts.');
    } catch (error) {
        console.error('Error updating counts:', error);
    }
}

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    return retryWithBackoff(async () => {
        const response = await fetch(url, {
            ...options,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers
            },
            signal: options.signal || AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }

        return response;
    }, maxRetries);
}

module.exports = {
    loadData,
    saveDomains,
    updateCounts,
    retryWithBackoff,
    fetchWithRetry
};