-- Create storage bucket for item images (manual add)
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for fast-mode item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for item-images bucket
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can update item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can delete item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images');

-- Set up RLS policies for items bucket (fast-mode)
CREATE POLICY "Anyone can view fast-mode item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'items');

CREATE POLICY "Authenticated users can upload fast-mode item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'items');

CREATE POLICY "Authenticated users can update fast-mode item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'items');

CREATE POLICY "Authenticated users can delete fast-mode item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'items');

