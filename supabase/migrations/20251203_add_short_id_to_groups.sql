-- Add short_id column to groups table
ALTER TABLE groups ADD COLUMN short_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_groups_short_id ON groups(short_id);
