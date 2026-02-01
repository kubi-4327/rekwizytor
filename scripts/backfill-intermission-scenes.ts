
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

async function backfillIntermissionScenes() {
    console.log('📦 Starting backfill of Intermission/Preparation scenes...')

    // 1. Fetch all scenes
    const { data: allScenes, error } = await supabase
        .from('scenes')
        .select('*')
        .order('act_number')
        .order('scene_number')

    if (error) {
        console.error('❌ Error fetching scenes:', error)
        return
    }

    if (!allScenes || allScenes.length === 0) {
        console.log('ℹ️  No scenes found.')
        return
    }

    console.log(`✓ Fetched ${allScenes.length} scenes. Analyzing...`)

    let updatedCount = 0
    let createdCount = 0
    let errorsCount = 0

    // 2. Update Act 0 to be 'preparation'
    const prepScenes = allScenes.filter(s => s.act_number === 0 && s.type !== 'preparation')
    if (prepScenes.length > 0) {
        console.log(`\nFound ${prepScenes.length} Act 0 scenes to mark as 'preparation'...`)
        for (const scene of prepScenes) {
            const { error: updateError } = await supabase
                .from('scenes')
                .update({ type: 'preparation' })
                .eq('id', scene.id)
            
            if (updateError) {
                console.error(`   ❌ Failed to update scene ${scene.id}:`, updateError)
                errorsCount++
            } else {
                updatedCount++
            }
        }
    }

    // 3. Handle Acts 1+
    // Group by performance -> act
    const scenesByPerfAct: Record<string, Record<number, any[]>> = {}
    
    allScenes.forEach(scene => {
        if (!scenesByPerfAct[scene.performance_id]) {
            scenesByPerfAct[scene.performance_id] = {}
        }
        if (!scenesByPerfAct[scene.performance_id][scene.act_number!]) {
            scenesByPerfAct[scene.performance_id][scene.act_number!] = []
        }
        scenesByPerfAct[scene.performance_id][scene.act_number!].push(scene)
    })

    for (const perfId of Object.keys(scenesByPerfAct)) {
        const acts = scenesByPerfAct[perfId]
        for (const actNumStr of Object.keys(acts)) {
            const actNum = parseInt(actNumStr)
            if (actNum === 0) continue // Skip prep act

            const actScenes = acts[actNum]
            
            // Check if intermission exists
            const existingIntermission = actScenes.find(s => s.type === 'intermission')
            if (existingIntermission) continue

            // Check if "Przerwa" named scene exists (legacy manual add)
            const legacyPrzerwa = actScenes.find(s => s.name?.toLowerCase().includes('przerwa'))
            
            if (legacyPrzerwa) {
                // Update it to type=intermission
                // Ensure it is at the end? We'll leave order as is for now, just type it
                 const { error: updateError } = await supabase
                    .from('scenes')
                    .update({ type: 'intermission' })
                    .eq('id', legacyPrzerwa.id)

                if (updateError) {
                    console.error(`   ❌ Failed to update legacy intermission scene ${legacyPrzerwa.id}:`, updateError)
                     errorsCount++
                } else {
                    console.log(`   Updated legacy scene "${legacyPrzerwa.name}" to intermission type.`)
                    updatedCount++
                }
            } else {
                // Create new Intermission scene at the end
                const maxSceneNum = Math.max(...actScenes.map(s => s.scene_number), 0)
                const newSceneNum = maxSceneNum + 1

                const { error: insertError } = await supabase
                    .from('scenes')
                    .insert({
                        performance_id: perfId,
                        act_number: actNum,
                        scene_number: newSceneNum,
                        name: 'Przerwa',
                        type: 'intermission'
                    })

                if (insertError) {
                    console.error(`   ❌ Failed to create intermission for Perf ${perfId} Act ${actNum}:`, insertError)
                    errorsCount++
                } else {
                    // console.log(`   Created new intermission for Perf ${perfId} Act ${actNum}`)
                    createdCount++
                }
            }
        }
    }

    console.log(`\n\n✅ Backfill completed!`)
    console.log(`   Updated: ${updatedCount}`)
    console.log(`   Created: ${createdCount}`)
    console.log(`   Errors:  ${errorsCount}`)
}

backfillIntermissionScenes().catch(console.error)
