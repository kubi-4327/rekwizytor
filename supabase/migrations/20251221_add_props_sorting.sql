-- Add supporting columns for Kanban view
ALTER TABLE performance_props 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS column_index INTEGER DEFAULT 0;

-- Create index for faster ordering lookups
CREATE INDEX IF NOT EXISTS idx_performance_props_ordering 
ON performance_props(performance_id, column_index, sort_order);

-- Update RLS to ensure these new columns are writable by approved users (existing policies should cover it as they are usually ON TABLE or check operation, but good to verify if specific columns were restricted - checking previous file shows generic policies)
-- The existing policies were:
-- CREATE POLICY "Approved users can update props" ON performance_props FOR UPDATE USING (is_approved());
-- This covers all columns, so no RLS change needed.
