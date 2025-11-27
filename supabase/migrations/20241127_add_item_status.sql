ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- Optional: Create an index if needed, but for now simple column is enough.
-- We could use an ENUM but text is more flexible for now.
