-- Add columns for poster and theme color to performances table
ALTER TABLE performances
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Create storage bucket for posters if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the posters bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posters' );

CREATE POLICY "Authenticated users can upload posters"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'posters' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can update posters"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'posters' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can delete posters"
ON storage.objects FOR DELETE
USING ( bucket_id = 'posters' AND auth.role() = 'authenticated' );
