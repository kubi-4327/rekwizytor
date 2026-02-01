import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function addPreparationScenes() {
    console.log('📦 Adding "Preparation" scene (Act 0, Scene 0) to all performances that don\'t have it...\n')

    // 1. Fetch all performances
    const { data: performances, error: perfError } = await supabase
        .from('performances')
        .select('id, title')

    if (perfError) {
        console.error('❌ Error fetching performances:', perfError)
        return
    }

    if (!performances || performances.length === 0) {
        console.log('ℹ️  No performances found.')
        return
    }

    console.log(`✓ Found ${performances.length} performances. Checking for preparation scenes...\n`)

    // 2. Fetch all scenes
    const { data: allScenes, error: sceneError } = await supabase
        .from('scenes')
        .select('performance_id, act_number, scene_number')

    if (sceneError) {
        console.error('❌ Error fetching scenes:', sceneError)
        return
    }

    // 3. Group scenes by performance_id
    const scenesByPerformance: Record<string, any[]> = {}
    allScenes?.forEach(scene => {
        if (!scene.performance_id) return
        if (!scenesByPerformance[scene.performance_id]) {
            scenesByPerformance[scene.performance_id] = []
        }
        scenesByPerformance[scene.performance_id].push(scene)
    })

    // 4. Identify performances without preparation scene
    const performancesNeedingPrep: any[] = []

    for (const perf of performances) {
        const scenes = scenesByPerformance[perf.id] || []
        const hasPrep = scenes.some(s => s.act_number === 0 && s.scene_number === 0)
        
        if (!hasPrep) {
            console.log(`   Missing prep: "${perf.title}" (${perf.id.slice(0, 8)}...)`)
            performancesNeedingPrep.push(perf)
        }
    }

    if (performancesNeedingPrep.length === 0) {
        console.log('✅ All performances already have preparation scenes!')
        return
    }

    console.log(`\n📋 Found ${performancesNeedingPrep.length} performances needing preparation scenes.`)
    console.log('   Creating scenes...\n')

    // 5. Create preparation scenes
    const scenesToInsert = performancesNeedingPrep.map(perf => ({
        performance_id: perf.id,
        act_number: 0,
        scene_number: 0,
        name: 'Przygotowanie',
        type: 'preparation' as const
    }))

    const { data: inserted, error: insertError } = await supabase
        .from('scenes')
        .insert(scenesToInsert)
        .select()

    if (insertError) {
        console.error('❌ Error inserting preparation scenes:', insertError)
        return
    }

    console.log(`✅ Successfully created ${inserted?.length || 0} preparation scenes!\n`)
    
    // 6. Summary
    console.log('📊 Summary:')
    console.log(`   Total performances: ${performances.length}`)
    console.log(`   Already had prep: ${performances.length - performancesNeedingPrep.length}`)
    console.log(`   Added prep scenes: ${inserted?.length || 0}`)
}

addPreparationScenes().catch(console.error)
