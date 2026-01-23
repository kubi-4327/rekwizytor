#!/usr/bin/env node

/**
 * Cleanup script for orphaned embedding test results
 * Removes results that don't have a corresponding test run
 */

import { cleanupOrphanedResults } from '../app/actions/embedding-tests-cleanup.js'

async function main() {
    console.log('🧹 Starting cleanup of orphaned test results...\n')

    try {
        const result = await cleanupOrphanedResults()

        if (result.success) {
            console.log('\n✅ Cleanup completed successfully!')
            console.log(`📊 Deleted ${result.deletedCount} orphaned results`)
            process.exit(0)
        } else {
            console.error('\n❌ Cleanup failed!')
            console.error(`Error: ${result.error}`)
            process.exit(1)
        }
    } catch (error) {
        console.error('\n💥 Unexpected error during cleanup:')
        console.error(error)
        process.exit(1)
    }
}

main()
