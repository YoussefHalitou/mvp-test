-- Migration: Create t_nachkalkulation_submissions table
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS t_nachkalkulation_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    submitted_by TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_comment TEXT,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_id UUID REFERENCES t_files(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries by status
CREATE INDEX IF NOT EXISTS idx_nk_submissions_status ON t_nachkalkulation_submissions(status);
CREATE INDEX IF NOT EXISTS idx_nk_submissions_project ON t_nachkalkulation_submissions(project_id);

-- Enable RLS
ALTER TABLE t_nachkalkulation_submissions ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (adjust for production)
CREATE POLICY "Allow all for nk_submissions" ON t_nachkalkulation_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for development (matches existing pattern)
CREATE POLICY "Allow all anon for nk_submissions" ON t_nachkalkulation_submissions FOR ALL USING (true);
