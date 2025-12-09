'use server'

import { createClient } from '@/utils/supabase/server'

export type DiagnosticResult = {
    timestamp: string
    environment: string
    supabaseUrl: string | null
    supabaseKeyPrefix: string | null
    authStatus: {
        hasSession: boolean
        userId: string | null
        userEmail: string | null
        userRole: string | null
        error: string | null
    }
    profileStatus: {
        exists: boolean
        status: string | null
        role: string | null
        error: string | null
    }
    rpcTest: {
        search_global: {
            success: boolean
            resultCount: number
            error: string | null
            errorCode: string | null
            errorHint: string | null
        }
        search_global_hybrid: {
            success: boolean
            resultCount: number
            error: string | null
            errorCode: string | null
            errorHint: string | null
        }
    }
    materializedViewTest: {
        canAccess: boolean
        rowCount: number | null
        error: string | null
    }
    functionsInfo: {
        search_global_exists: boolean
        search_global_security: string | null
        search_global_hybrid_exists: boolean
        search_global_hybrid_security: string | null
        error: string | null
    }
}

export async function runSearchDiagnostics(): Promise<DiagnosticResult> {
    const supabase = await createClient()

    const result: DiagnosticResult = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) || null,
        supabaseKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || null,
        authStatus: {
            hasSession: false,
            userId: null,
            userEmail: null,
            userRole: null,
            error: null
        },
        profileStatus: {
            exists: false,
            status: null,
            role: null,
            error: null
        },
        rpcTest: {
            search_global: {
                success: false,
                resultCount: 0,
                error: null,
                errorCode: null,
                errorHint: null
            },
            search_global_hybrid: {
                success: false,
                resultCount: 0,
                error: null,
                errorCode: null,
                errorHint: null
            }
        },
        materializedViewTest: {
            canAccess: false,
            rowCount: null,
            error: null
        },
        functionsInfo: {
            search_global_exists: false,
            search_global_security: null,
            search_global_hybrid_exists: false,
            search_global_hybrid_security: null,
            error: null
        }
    }

    // 1. Check auth status
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
            result.authStatus.error = error.message
        } else if (user) {
            result.authStatus.hasSession = true
            result.authStatus.userId = user.id
            result.authStatus.userEmail = user.email || null
            result.authStatus.userRole = user.role || null
        }
    } catch (e) {
        result.authStatus.error = e instanceof Error ? e.message : 'Unknown auth error'
    }

    // 2. Check profile status
    if (result.authStatus.userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, status, role')
                .eq('id', result.authStatus.userId)
                .single()

            if (error) {
                result.profileStatus.error = error.message
            } else if (data) {
                result.profileStatus.exists = true
                result.profileStatus.status = data.status
                result.profileStatus.role = data.role
            }
        } catch (e) {
            result.profileStatus.error = e instanceof Error ? e.message : 'Unknown profile error'
        }
    }

    // 3. Test search_global RPC
    try {
        const { data, error } = await supabase.rpc('search_global', {
            query_text: 'test',
            match_threshold: 0.5,
            match_count: 5,
            fuzzy_threshold: 0.3
        })

        if (error) {
            result.rpcTest.search_global.error = error.message
            result.rpcTest.search_global.errorCode = error.code || null
            result.rpcTest.search_global.errorHint = error.hint || null
        } else {
            result.rpcTest.search_global.success = true
            result.rpcTest.search_global.resultCount = Array.isArray(data) ? data.length : 0
        }
    } catch (e) {
        result.rpcTest.search_global.error = e instanceof Error ? e.message : 'Unknown RPC error'
    }

    // 4. Test materialized view access directly
    try {
        const { count, error } = await supabase
            .from('vw_searchable_entities')
            .select('*', { count: 'exact', head: true })

        if (error) {
            result.materializedViewTest.error = error.message
        } else {
            result.materializedViewTest.canAccess = true
            result.materializedViewTest.rowCount = count
        }
    } catch (e) {
        result.materializedViewTest.error = e instanceof Error ? e.message : 'Unknown view error'
    }

    return result
}
