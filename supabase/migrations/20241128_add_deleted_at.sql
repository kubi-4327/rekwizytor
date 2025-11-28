-- Add deleted_at column to performances
ALTER TABLE performances ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to groups
ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to locations
ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for performance optimization
CREATE INDEX idx_performances_deleted_at ON performances(deleted_at);
CREATE INDEX idx_groups_deleted_at ON groups(deleted_at);
CREATE INDEX idx_locations_deleted_at ON locations(deleted_at);
