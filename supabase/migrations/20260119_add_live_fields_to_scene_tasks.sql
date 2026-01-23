-- Add is_completed field to scene_tasks for live view tracking
ALTER TABLE scene_tasks 
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;

-- Add assigned_to field for task assignment
ALTER TABLE scene_tasks
ADD COLUMN assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add live_notes field for notes during performance
ALTER TABLE scene_tasks
ADD COLUMN live_notes TEXT;

-- Create index for faster queries on completion status
CREATE INDEX idx_scene_tasks_completed ON scene_tasks(scene_id, is_completed);
