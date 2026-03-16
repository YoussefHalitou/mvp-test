-- Add replacement tracking columns to t_time_pairs
ALTER TABLE t_time_pairs ADD COLUMN IF NOT EXISTS replaced_by text;
ALTER TABLE t_time_pairs ADD COLUMN IF NOT EXISTS is_replacement boolean DEFAULT false;
