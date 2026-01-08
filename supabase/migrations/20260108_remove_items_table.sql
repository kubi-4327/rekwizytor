-- Migration: Remove legacy items table and related tables
-- Created: 2026-01-08
-- Description: Removes unused items inventory system, keeping only performance_props

-- Step 1: Drop foreign key constraints first
ALTER TABLE IF EXISTS performance_items DROP CONSTRAINT IF EXISTS performance_items_item_id_fkey;
ALTER TABLE IF EXISTS scene_checklist_items DROP CONSTRAINT IF EXISTS scene_checklist_items_item_id_fkey;

-- Step 2: Drop views that depend on items
DROP VIEW IF EXISTS vw_active_items CASCADE;
DROP VIEW IF EXISTS vw_items_by_location CASCADE;

-- Step 3: Drop the performance_items table (legacy, replaced by performance_props)
DROP TABLE IF EXISTS performance_items CASCADE;

-- Step 4: Drop the items table
DROP TABLE IF EXISTS items CASCADE;

-- Note: Keeping scene_checklist_items and scene_checklists for now
-- as they may still be in use. item_id column will become orphaned
-- but won't cause errors. Can be cleaned up later if confirmed unused.
