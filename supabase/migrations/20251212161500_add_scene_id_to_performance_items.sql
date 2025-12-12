-- Add scene_id column to performance_items
ALTER TABLE performance_items ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id);

-- Attempt to backfill data
DO $$
DECLARE
    r RECORD;
    s_id UUID;
BEGIN
    FOR r IN SELECT * FROM performance_items WHERE scene_id IS NULL AND scene_number IS NOT NULL LOOP
        -- Attempt to find matching scene by number and performance
        -- We cast scene_number to text to match performance_items type
        SELECT id INTO s_id FROM scenes 
        WHERE performance_id = r.performance_id 
          AND scene_number::text = r.scene_number
          -- If ambiguous, prioritize matching name if both present, then Act 1
          ORDER BY (CASE WHEN r.scene_name = name THEN 0 ELSE 1 END), act_number ASC
        LIMIT 1;
        
        IF s_id IS NOT NULL THEN
            UPDATE performance_items SET scene_id = s_id WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
