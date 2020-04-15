const test = require('baretest')('Conferences Test');
const assert = require('assert');
const range = require('lodash/range');
const getDuplicates = require('./utils');
const config = require('../config');
const validLocations = require('./validLocations');

const BASE_DIR = '../../conferences';

const twitterRegex = /@(\w){1,15}$/;
const httpRegex = /^http(s?):\/\//;
const usaStateRegex = /, ([A-Z][A-Z])|(D.C.)$/;
const dateRegex = /^20\d\d-\d\d(-\d\d)?$/;

const conferencesJSON = {};

range(config.startYear, config.currentYear + 2).forEach(year => {
    conferencesJSON[year] = {};
    config.topics.forEach(lang => {
        try {
            conferencesJSON[year][lang] = require(`${BASE_DIR}/${year}/${lang}.json`);
            // In case some years have no files
            // eslint-disable-next-line no-empty
        } catch (exception) { }
    });
});

const REQUIRED_KEYS = ['name', 'url', 'startDate', 'country', 'city'];
const DATES_KEYS = ['startDate', 'endDate', 'cfpEndDate'];

for (const year of Object.keys(conferencesJSON)) {
    for (const stack of Object.keys(conferencesJSON[year])) {
        const conferences = conferencesJSON[year][stack];

        test(`${stack} conferences in ${year}`, function () {

            const duplicates = getDuplicates(conferences);

            if (duplicates.length > 0) {
                const dupConfs = duplicates.map(conf => conf.name).join(', ');
                console.error(`Duplicates for ${year}/${stack}: ${dupConfs}`);
            }

            assert.equal(duplicates.length, 0);
        });

        for (const conference of conferences) {

            const { name, country, city, url, cfpUrl, twitter } = conference;

            test(`conferences/${year}/${stack}.json - ${name} - ${stack} - ${year}`, function () {
                // Twitter is a valid URL
                if (twitter && twitter.length > 0 && !twitterRegex.test(twitter)) {
                    assert(twitterRegex.test(twitter), `[twitter] should be formatted like @twitter – got: "${twitter}"`);
                }

                // url starts with http(s)://
                assert(httpRegex.test(url), `[url] should start with http – got: "${url}"`);

                // cfpUrl starts with http(s)://
                if (cfpUrl) {
                    assert(httpRegex.test(cfpUrl), `[cfpUrl] should start with http – got: "${cfpUrl}"`);
                }
                // Has no missing mandatory key
                REQUIRED_KEYS.forEach(requiredKey => {
                    assert(conference.hasOwnProperty(requiredKey), `[${requiredKey}] is missing`);
                });

                // Dates are correctly formatted
                DATES_KEYS.forEach(dateKey => {
                    // cfpEndDate could be undefined or null
                    if (conference[dateKey]) {
                        assert(dateRegex.test(conference[dateKey]), `[${dateKey}] should be formatter like YYYY-MM-DD or YYYY-MM – got: "${conference[dateKey]}"`)
                    }
                });

                assert(validLocations[country], `[country] is a not in the list of valid countries – got: "${country}"`);
                assert(validLocations[country].indexOf(city) !== -1, `[city] is a not in the list of valid cities – got: "${city}" in "${country}""`);
                if (country === "U.S.A.") {
                    assert(usaStateRegex.test(city), `[city] cities in the US must also contain the state – got: "${city}"`);
                }
            });
        };
    };
};

!(async function () {
    const result = await test.run();
    if (!result) {
        process.exitCode = 1;
        process.exit(1);
    }
})()