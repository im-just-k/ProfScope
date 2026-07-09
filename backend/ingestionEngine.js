const axios = require('axios');
const cheerio = require('cheerio');

/**
 * I created this centralized registry for all universities to make the system more scalable.
 * Each university has its own scraping rules defined here, which the ingestion engine uses to dynamically parse their faculty directories.
 * */
const UNIVERSITY_CONFIGS = {
    'uwaterloo': {
        name: 'University of Waterloo',
        url: 'https://uwaterloo.ca/computer-science/contacts',
        selectors: {
            row: '.directory-row',
            name: '.profile-name',
            email: 'a[href^="mailto:"]',
            department: 'Computer Science'
        }
    },
    'utoronto': {
        name: 'University of Toronto',
        url: 'https://web.cs.toronto.edu/people/faculty-directory',
        selectors: {
            row: 'table tbody tr',
            name: 'td:nth-child(1)',
            email: 'td:nth-child(2) a',
            department: 'Computer Science'
        }
    }
};

/**
 * This is the Universal Scraper Engine
 * Dynamically parses html pages using rules specified in UNIVERSITY_CONFIGS
 */
async function ingestUniversity(registryKey) {
    const config = UNIVERSITY_CONFIGS[registryKey];
    if (!config) {
        throw new Error(`[Engine Error] No scraping configuration found for key: ${registryKey}`);
    }

    console.log(`[Engine] Fetching target directory: ${config.url}`);
    
    const { data: html } = await axios.get(config.url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
    });
    
    const $ = cheerio.load(html);
    const facultyList = [];

    // Runs the configuration rules dynamically
    $(config.selectors.row).each((index, element) => {
        let rawName = $(element).find(config.selectors.name).text().trim();
        let email = $(element).find(config.selectors.email).text().trim();

        // Standardizes formatting for email protocols
        if (email.startsWith('mailto:')) {
            email = email.replace('mailto:', '');
        }

        // Cleans up title text from names if they exist inline
        if (rawName.includes('\n')) {
            rawName = rawName.split('\n')[0].trim();
        }
        rawName = rawName.replace(/(Professor|Associate|Assistant|Lecturer|Stream|Emeritus)/g, '').trim();

        if (rawName && email) {
            const nameParts = rawName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            facultyList.push({
                first_name: firstName,
                last_name: lastName,
                email: email,
                department: config.department || 'Computer Science'
            });
        }
    });

    console.log(`[Engine] Success! Extracted ${facultyList.length} records for ${config.name}.`);
    return facultyList;
}

module.exports = { ingestUniversity, UNIVERSITY_CONFIGS };