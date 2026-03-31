-- Add replacement tracking columns to t_work_assignments
ALTER TABLE t_work_assignments ADD COLUMN IF NOT EXISTS replaced_by text;
ALTER TABLE t_work_assignments ADD COLUMN IF NOT EXISTS is_replacement boolean DEFAULT false;
