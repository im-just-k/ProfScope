const axios = require('axios');

// Registry mapping universities to their specific scrapers and URLs
const PARSER_REGISTRY = {
    'uwaterloo': {
        url: 'https://uwaterloo.ca/computer-science/contacts',
        strategy: require('./parsers/uwaterloo')
    }
    // Future top 15 universities (UofT, UBC, McGill, etc.) will be added right here
};

/**
 * Core engine to ingest HTML from any registered Canadian university
 * @param {string} universityKey - Key matching the PARSER_REGISTRY
 */
async function ingestUniversity(universityKey) {
    const config = PARSER_REGISTRY[universityKey.toLowerCase()];
    
    if (!config) {
        throw new Error(`No parser registered for university key: "${universityKey}"`);
    }

    try {
        console.log(`[Engine] Fetching target directory: ${config.url}`);
        const response = await axios.get(config.url, {
            headers: { 'User-Agent': 'ProfScopeBot/1.0 (Educational Academic Research)' }
        });

        console.log(`[Engine] Routing HTML to "${universityKey}" strategy parser...`);
        const extractedFaculty = config.strategy.parse(response.data);
        
        console.log(`[Engine] Success! Extracted ${extractedFaculty.length} records.`);
        return extractedFaculty;

    } catch (error) {
        console.error(`[Engine Error] Failed handling ${universityKey}:`, error.message);
        return [];
    }
}

// Quick runnable execution test
(async () => {
    console.log('--- Starting ProfScope Ingestion Test ---');
    const waterlooData = await ingestUniversity('uwaterloo');
    console.log('Sample Data Extracted:', waterlooData.slice(0, 2));
})();

module.exports = { ingestUniversity };