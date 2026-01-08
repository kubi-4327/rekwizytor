
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try service role key first, then anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL present:', !!supabaseUrl);
console.log('Key present:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGroups() {
    try {
        console.log('Fetching counts...');
        const { count: groupsCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
        const { count: locationsCount } = await supabase.from('locations').select('*', { count: 'exact', head: true });
        const { count: performancesCount } = await supabase.from('performances').select('*', { count: 'exact', head: true });

        console.log(`Groups: ${groupsCount}`);
        console.log(`Locations: ${locationsCount}`);
        console.log(`Performances: ${performancesCount}`);

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkGroups();
