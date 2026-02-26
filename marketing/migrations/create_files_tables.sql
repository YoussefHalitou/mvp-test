-- Migration: Create t_folders and t_files tables
-- Run this in the Supabase SQL Editor

-- Folders table (supports nested folders via parent_id)
CREATE TABLE IF NOT EXISTS t_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES t_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files table (references a folder, stores Supabase Storage path)
CREATE TABLE IF NOT EXISTS t_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES t_folders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE t_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_files ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON t_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON t_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create a storage bucket for file uploads (run once)
-- In Supabase Dashboard: Storage > New Bucket > Name: "files", Public: false
