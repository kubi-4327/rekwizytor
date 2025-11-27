ALTER TABLE scene_checklists ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
