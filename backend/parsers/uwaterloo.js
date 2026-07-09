const cheerio = require('cheerio');

/**
 * Parser strategy for University of Waterloo CS Directory
 * @param {string} htmlRaw 
 * @returns {Array<Object>} Clean faculty data
 */
function parse(htmlRaw) {
    const $ = cheerio.load(htmlRaw);
    const profiles = [];

    // Targets Waterloo's specific profile card selectors
    $('.directory-entry, .vcard').each((_, el) => {
        const fullName = $(el).find('.fn, h2, h3').text().trim();
        const email = $(el).find('a[href^="mailto:"]').text().trim();

        if (!fullName || !email) return;

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        profiles.push({
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            department: 'Computer Science'
        });
    });

    return profiles;
}

module.exports = { parse };