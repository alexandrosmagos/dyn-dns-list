const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDomain, readCanonicalRecords } = require('./csv');

test('normalizes valid domains', () => {
  assert.equal(normalizeDomain('.CloudNS.PH'), 'cloudns.ph');
  assert.equal(normalizeDomain('dynu.net - Corporate only'), 'dynu.net');
  assert.equal(normalizeDomain('Example.COM.'), 'example.com');
});

test('rejects malformed domains', () => {
  for (const value of ['', 'not a domain', 'https://example.com', '-bad.example']) assert.equal(normalizeDomain(value), null);
});

test('canonical records are unique, valid and sorted', () => {
  const { records } = readCanonicalRecords();
  assert.ok(records.length > 0);
  assert.equal(new Set(records.map(r => r.domain)).size, records.length);
  assert.deepEqual(records.map(r => r.domain), [...records.map(r => r.domain)].sort((a,b) => a.localeCompare(b)));
});
