const fs = require('fs');
const path = require('path');
const { domainToASCII } = require('url');

const dataPath = path.join(__dirname, 'data');
const rootPath = path.join(__dirname, '..');

function normalizeDomain(value) {
    if (typeof value !== 'string') return null;
    let domain = value.trim().toLowerCase();
    if (!domain) return null;
    domain = domain.replace(/^\.+/, '').replace(/\.+$/, '');
    if (domain.includes(' - ')) domain = domain.split(' - ')[0].trim();
    const ascii = domainToASCII(domain);
    if (!ascii || ascii.length > 253 || !ascii.includes('.')) return null;
    const labels = ascii.split('.');
    if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null;
    return ascii;
}

function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function readCanonicalRecords() {
    const files = fs.readdirSync(dataPath).filter(file => file.endsWith('.json')).sort();
    const byDomain = new Map();
    let rawCount = 0;
    let invalidCount = 0;

    for (const file of files) {
        const provider = path.basename(file, '.json');
        const data = JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf8'));
        for (const entry of data) {
            rawCount++;
            const domain = normalizeDomain(entry.domain);
            if (!domain) { invalidCount++; continue; }
            const retrievedAt = entry.retrievedAt || null;
            const existing = byDomain.get(domain);
            if (!existing) {
                byDomain.set(domain, { domain, retrievedAt, providers: new Set([provider]) });
            } else {
                existing.providers.add(provider);
                if (retrievedAt && (!existing.retrievedAt || String(retrievedAt) > String(existing.retrievedAt))) existing.retrievedAt = retrievedAt;
            }
        }
    }

    const records = [...byDomain.values()].map(record => ({
        domain: record.domain,
        retrievedAt: record.retrievedAt,
        providers: [...record.providers].sort()
    })).sort((a, b) => a.domain.localeCompare(b.domain));
    return { records, rawCount, invalidCount };
}

function writeFile(name, content) {
    fs.writeFileSync(path.join(rootPath, name), content.endsWith('\n') ? content : `${content}\n`);
}

async function start() {
    const { records, rawCount, invalidCount } = readCanonicalRecords();
    const generatedAt = new Date().toISOString();
    const domains = records.map(r => r.domain);

    writeFile('links.txt', domains.join('\n'));
    writeFile('links.csv', ['Domain,RetrievedAt,Provider', ...records.map(r => [csvEscape(r.domain), csvEscape(r.retrievedAt || ''), csvEscape(r.providers.join(';'))].join(','))].join('\n'));
    writeFile('links.json', JSON.stringify({ generatedAt, count: records.length, domains: records }, null, 2));
    writeFile('links.jsonl', records.map(r => JSON.stringify(r)).join('\n'));
    writeFile('links.hosts', domains.map(d => `0.0.0.0 ${d}`).join('\n'));
    writeFile('links.dnsmasq', domains.map(d => `server=/${d}/`).join('\n'));
    writeFile('links.adblock', domains.map(d => `||${d}^`).join('\n'));
    writeFile('links.rpz', ['$TTL 60', '@ IN SOA localhost. root.localhost. 1 60 60 60 60', '@ IN NS localhost.', ...domains.map(d => `${d}. CNAME .`)].join('\n'));

    console.log(`Generated ${records.length} unique valid domains from ${rawCount} source records; filtered ${invalidCount} invalid records.`);
    return { count: records.length, rawCount, invalidCount };
}

if (require.main === module) start().catch(err => { console.error(err); process.exitCode = 1; });
module.exports = { start, normalizeDomain, readCanonicalRecords };
