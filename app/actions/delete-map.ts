'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteMap(locationId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('locations')
            .update({
                map_image_url: null,
                map_svg: null,
                pins_data: [] // Optionally clear pins too if the map is gone, or keep them? User said "remove generated plan". Usually safer to remove map but maybe keep pins? But pins positions are relative to map. Let's clear pins to avoid ghost pins.
            })
            .eq('id', locationId)

        if (error) throw error

        // Optionally delete the file from storage? 
        // For MVP speed, we can skip deleting the file from bucket or do it if we want to be clean.
        // Let's just unlink from DB first.

        revalidatePath(`/mapping/${locationId}`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting map:', error)
        return { success: false, error: 'Nie udało się usunąć mapy' }
    }
}
