-- Migration: Create QR Codes table for universal redirects (Enhanced)
-- Created: 2026-01-08

CREATE TABLE IF NOT EXISTS qr_codes (
    code text PRIMARY KEY,                   -- The short code (e.g., "X9y2K")
    target_url text NOT NULL,                -- Where to redirect
    description text,                        -- User-friendly label
    
    -- Ownership and Access Control
    created_by uuid REFERENCES auth.users(id), -- Who created it
    access_level text CHECK (access_level IN ('public', 'authenticated', 'private')) DEFAULT 'authenticated',
    active boolean DEFAULT true,             -- active/inactive (lost) status
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    clicks int DEFAULT 0                     -- Basic analytics
);

-- RLS Policies
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- 1. View Policy:
-- Public codes: Everyone can see
-- Authenticated codes: Only logged in users
-- Private codes: Only the creator
-- Inactive codes: Only the creator can see (to reactivate)
CREATE POLICY "View QR Codes"
ON qr_codes FOR SELECT
USING (
    (active = true AND access_level = 'public') OR
    (auth.role() = 'authenticated' AND active = true AND access_level = 'authenticated') OR
    (auth.uid() = created_by) -- Creator sees everything (including inactive/private)
);

-- 2. Create Policy: Authenticated users can create
CREATE POLICY "Create QR Codes"
ON qr_codes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 3. Update Policy: Only creator can update (or admins if we had them, stick to creator for now)
CREATE POLICY "Update own QR Codes"
ON qr_codes FOR UPDATE TO authenticated
USING (auth.uid() = created_by);
