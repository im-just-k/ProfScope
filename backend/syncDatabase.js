require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ingestUniversity, UNIVERSITY_CONFIGS } = require('./ingestionEngine');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * Syncs a single university into Supabase
 */
async function syncUniversityFaculty(universityName, registryKey) {
    try {
        console.log(`\n--- Starting Sync for ${universityName} ---`);
        
        // Resolves matching database entity UUID
        const { data: uni, error: uniError } = await supabase
            .from('universities')
            .select('id')
            .eq('name', universityName)
            .single();

        if (uniError || !uni) {
            console.error(`[Sync Error] "${universityName}" not found in DB seed data. Skipping.`);
            return;
        }

        // Fetches records from scraping architecture
        const scrapedFaculty = await ingestUniversity(registryKey);
        if (scrapedFaculty.length === 0) {
            console.log(`[Sync Warning] No data extracted for ${universityName}.`);
            return;
        }

        // Maps values to data columns
        const facultyToInsert = scrapedFaculty.map(prof => ({
            first_name: prof.first_name,
            last_name: prof.last_name,
            email: prof.email,
            university_id: uni.id,
            department: prof.department
        }));

        // 4. Batch upsert payload to Supabase (ignores conflict errors automatically)
        const { error: insertError } = await supabase
            .from('faculty')
            .upsert(facultyToInsert, { onConflict: 'email' });

        if (insertError) throw insertError;
        console.log(`[Sync Success] Database synchronized safely for ${universityName}!`);

    } catch (error) {
        console.error(`[Sync Failure] Processing error on ${universityName}:`, error.message);
    }
}

/**
 * Global Sequence Orchestrator
 * Sweeps through all configured platforms dynamically
 */
async function syncAllUniversities() {
    console.log("=== BEGINNING GLOBAL PROF SCOPE INGESTION ===");
    
    const keys = Object.keys(UNIVERSITY_CONFIGS);
    
    for (const key of keys) {
        const targetUni = UNIVERSITY_CONFIGS[key];
        await syncUniversityFaculty(targetUni.name, key);
    }
    
    console.log("\n=== GLOBAL INGESTION COMPLETE ===");
}

// Fires execution sequence
syncAllUniversities();