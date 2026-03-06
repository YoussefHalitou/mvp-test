-- Add Dienstleistung (Makro) column to Project table
ALTER TABLE public.t_projects 
ADD COLUMN IF NOT EXISTS dienstleistung_makro text;
