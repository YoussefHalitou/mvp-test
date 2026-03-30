-- Migration: Nachkalkulation modifications
-- 1. Add kundennummer and angebotsnummer columns to t_projects
-- 2. Create t_project_kv_values table for persisting KV values

-- Add Kundennummer & Angebotsnummer to projects
ALTER TABLE t_projects ADD COLUMN IF NOT EXISTS kundennummer TEXT;
ALTER TABLE t_projects ADD COLUMN IF NOT EXISTS angebotsnummer TEXT;

-- Create KV values persistence table
CREATE TABLE IF NOT EXISTS t_project_kv_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES t_projects(project_id) ON DELETE CASCADE,
    kv_key TEXT NOT NULL,
    kv_value NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, kv_key)
);

ALTER TABLE t_project_kv_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON t_project_kv_values FOR ALL USING (true);
