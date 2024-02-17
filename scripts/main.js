const afraid = require('./scrapers/afraid.js');
const changeip = require('./scrapers/changeip.js');
const cloudns = require('./scrapers/cloudns.js'); //captcha
const dnsexit = require('./scrapers/dnsexit.js');
const duiadns = require('./scrapers/duiadns');
const dyn = require('./scrapers/dyn.js');
const dynv6 = require('./scrapers/dynv6.js');
const gslb = require('./scrapers/gslb.js');
const noip = require('./scrapers/noip.js');
const nowdns = require('./scrapers/now-dns.js');
const pubyun = require('./scrapers/pubyun.js');
const dynu = require('./scrapers/dynu.js');

const csv = require('./csv');

const startTime = new Date();

const scrapers = [
    afraid.scrape(),
    dynu.scrape(),
    cloudns.scrape(),
    changeip.scrape(),
    dnsexit.scrape(),
    duiadns.scrape(),
    dyn.scrape(),
    dynv6.scrape(),
    gslb.scrape(),
    noip.scrape(),
    nowdns.scrape(),
    pubyun.scrape()
];

Promise.all(scrapers)
    .then(() => {
        return csv.start();
    })
    .then(() => {
        const endTime = new Date();
        const timeTaken = (endTime - startTime) / (1000 * 60); // Convert milliseconds to minutes
        console.log(`The script took ${timeTaken} minutes to complete.`);
    })
    .catch((error) => {
        console.error('There was an error running the scrapers:', error);
    });
