-- Store project-specific customer prices separately from catalog defaults.
-- Existing rows remain NULL and continue to use the current catalog price.

ALTER TABLE public.t_project_material_usage
    ADD COLUMN IF NOT EXISTS price_per_unit numeric;

ALTER TABLE public.t_project_service_usage
    ADD COLUMN IF NOT EXISTS price_per_unit numeric;
