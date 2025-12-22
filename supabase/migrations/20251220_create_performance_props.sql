-- Create new performance_props table
CREATE TABLE performance_props (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_performance_props_performance_id ON performance_props(performance_id);
CREATE INDEX idx_performance_props_checked ON performance_props(performance_id, is_checked);

-- Enable RLS
ALTER TABLE performance_props ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view props for performances they can view"
    ON performance_props FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM performances
            WHERE performances.id = performance_props.performance_id
            AND performances.deleted_at IS NULL
        )
    );

CREATE POLICY "Approved users can insert props"
    ON performance_props FOR INSERT
    WITH CHECK (is_approved());

CREATE POLICY "Approved users can update props"
    ON performance_props FOR UPDATE
    USING (is_approved());

CREATE POLICY "Approved users can delete props"
    ON performance_props FOR DELETE
    USING (is_approved());

-- Migrate existing data from performance_items
INSERT INTO performance_props (performance_id, name, is_checked, created_at)
SELECT 
    pi.performance_id,
    COALESCE(pi.item_name_snapshot, i.name, 'Unnamed Item') as name,
    FALSE as is_checked,
    pi.created_at
FROM performance_items pi
LEFT JOIN items i ON i.id = pi.item_id
WHERE pi.performance_id IS NOT NULL
ORDER BY pi.created_at;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_performance_props_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER performance_props_updated_at
    BEFORE UPDATE ON performance_props
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_props_updated_at();
