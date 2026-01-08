const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkChecklistItems() {
    console.log('Sprawdzam zawart ość scene_checklist_items...')

    const { data, error, count } = await supabase
        .from('scene_checklist_items')
        .select('*', { count: 'exact' })
        .limit(5)

    if (error) {
        console.error('Błąd:', error)
        return
    }

    console.log(`\nLiczba rekordów: ${count}`)
    console.log('\nPrzykładowe dane:')
    console.log(JSON.stringify(data, null, 2))
}

checkChecklistItems().then(() => process.exit())
