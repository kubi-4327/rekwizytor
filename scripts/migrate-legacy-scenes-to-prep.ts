
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

async function migrateLegacyScenes() {
    console.log('📦 Starting migration of legacy scenes to "Preparation" (Act 0, Scene 0)...')

    // 1. Fetch all scenes
    const { data: allScenes, error } = await supabase
        .from('scenes')
        .select('*')

    if (error) {
        console.error('❌ Error fetching scenes:', error)
        return
    }

    if (!allScenes || allScenes.length === 0) {
        console.log('ℹ️  No scenes found.')
        return
    }

    console.log(`✓ Fetched ${allScenes.length} scenes. Analyzing...`)

    // 2. Group scenes by performance_id
    const scenesByPerformance: Record<string, any[]> = {}
    allScenes.forEach(scene => {
        if (!scene.performance_id) return
        if (!scenesByPerformance[scene.performance_id]) {
            scenesByPerformance[scene.performance_id] = []
        }
        scenesByPerformance[scene.performance_id].push(scene)
    })

    // 3. Identify candidates
    const scenesToUpdate: any[] = []

    for (const [perfId, scenes] of Object.entries(scenesByPerformance)) {
        // Criterion: Performance has exactly ONE scene
        if (scenes.length === 1) {
            const scene = scenes[0]

            // Criterion: Scene is NOT already Act 0 (Preparation)
            // We assume anything that isn't Act 0 is a legacy "Scene 1" that should be Prep
            if (scene.act_number !== 0) {
                console.log(`   Found candidate: Performance ${perfId.slice(0, 8)}... - Scene "${scene.name || 'Unhamed'}" (Act ${scene.act_number}, Scene ${scene.scene_number})`)
                scenesToUpdate.push(scene)
            }
        }
    }

    if (scenesToUpdate.length === 0) {
        console.log('✅ No legacy scenes found needing migration.')
        return
    }

    console.log(`\n📋 Identified ${scenesToUpdate.length} scenes to migrate.`)
    console.log('   Action: Update to Act 0, Scene 0, Name "Przygotowanie"')

    // 4. Perform updates
    let successCount = 0
    let failureCount = 0

    for (const scene of scenesToUpdate) {
        const { error: updateError } = await supabase
            .from('scenes')
            .update({
                act_number: 0,
                scene_number: 0,
                name: 'Przygotowanie'
            })
            .eq('id', scene.id)

        if (updateError) {
            console.error(`   ❌ Failed to update scene ${scene.id}:`, updateError)
            failureCount++
        } else {
            successCount++
        }
    }

    console.log(`\n\n✅ Migration completed!`)
    console.log(`   Updated: ${successCount}`)
    console.log(`   Failed: ${failureCount}`)
}

migrateLegacyScenes().catch(console.error)
