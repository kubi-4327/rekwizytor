
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Using SCHEMA_SERVICE_ROLE_KEY (RLS Bypass)');
} else {
    console.log('Using ANON_KEY (Subject to RLS - might return empty data)');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- FETCHING GROUPS ---');
    const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('name')
        .is('deleted_at', null);

    if (groupsError) console.error(groupsError);
    else groups.forEach(g => console.log(`GROUP: ${g.name}`));

    console.log('\n--- FETCHING PERFORMANCES ---');
    const { data: perfs, error: perfsError } = await supabase
        .from('performances')
        .select('title')
        .is('deleted_at', null);

    if (perfsError) console.error(perfsError);
    else perfs.forEach(p => console.log(`PERFORMANCE: ${p.title}`));
}

main();
