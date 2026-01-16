-- Create scene_tasks table to replace "Notatka sceniczna" system
-- Tasks are now stored directly in the database instead of in note content

CREATE TABLE scene_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_scene_tasks_scene_id ON scene_tasks(scene_id);
CREATE INDEX idx_scene_tasks_order ON scene_tasks(scene_id, order_index);

-- Enable RLS
ALTER TABLE scene_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage tasks for performances they have access to
CREATE POLICY "Users can manage scene tasks"
ON scene_tasks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM scenes s
        JOIN performances p ON s.performance_id = p.id
        WHERE s.id = scene_tasks.scene_id
        AND p.created_by = auth.uid()
    )
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_scene_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scene_tasks_updated_at
    BEFORE UPDATE ON scene_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_scene_tasks_updated_at();
