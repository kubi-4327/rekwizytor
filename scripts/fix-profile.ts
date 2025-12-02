import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function fixProfile() {
    const email = 'inspector@theater.com'
    console.log(`Looking for user: ${email}`)

    // 1. Get User from Auth
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
        console.error('Error listing users:', userError)
        return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
        console.error('User not found in Auth!')
        return
    }

    console.log(`Found user in Auth: ${user.id}`)

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profile) {
        console.log('Profile already exists:', profile)
        if (profile.status !== 'approved') {
            console.log('Approving user...')
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ status: 'approved', role: 'admin' })
                .eq('id', user.id)

            if (updateError) console.error('Error approving:', updateError)
            else console.log('User approved and made admin.')
        }
        return
    }

    console.log('Profile missing. Creating...')

    // 3. Create Profile
    const { error: insertError } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            email: user.email,
            full_name: 'Inspector',
            role: 'admin',
            status: 'approved'
        })

    if (insertError) {
        console.error('Error creating profile:', insertError)
    } else {
        console.log('Profile created successfully!')
    }
}

fixProfile()
