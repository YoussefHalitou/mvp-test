-- Fix: Drop old RLS policies and recreate with permissive access
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON t_folders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON t_files;

-- Create permissive policies (matching pattern of other tables)
CREATE POLICY "Allow all for folders" ON t_folders FOR ALL USING (true);
CREATE POLICY "Allow all for files" ON t_files FOR ALL USING (true);

-- Also create storage policies for the 'files' bucket
-- Go to Supabase Dashboard -> Storage -> files bucket -> Policies
-- And add these (or run the SQL below):

INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files');
CREATE POLICY "Allow downloads" ON storage.objects FOR SELECT USING (bucket_id = 'files');
CREATE POLICY "Allow deletes" ON storage.objects FOR DELETE USING (bucket_id = 'files');
CREATE POLICY "Allow updates" ON storage.objects FOR UPDATE USING (bucket_id = 'files');
