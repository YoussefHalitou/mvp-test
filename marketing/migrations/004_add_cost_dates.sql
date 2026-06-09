-- Add project-day attribution for cost positions used in Tracking and Nachkalkulation.
-- NULL means project-level / all-days; a date value means the row belongs to that specific project day.

ALTER TABLE public.t_project_material_usage
    ADD COLUMN IF NOT EXISTS cost_date date;

ALTER TABLE public.t_project_service_usage
    ADD COLUMN IF NOT EXISTS cost_date date;

ALTER TABLE public.t_project_vehicle_costs
    ADD COLUMN IF NOT EXISTS cost_date date;

ALTER TABLE public.t_project_costs_extra
    ADD COLUMN IF NOT EXISTS cost_date date;

ALTER TABLE public.t_project_bnk_costs
    ADD COLUMN IF NOT EXISTS cost_date date;

CREATE INDEX IF NOT EXISTS idx_project_material_usage_project_cost_date
    ON public.t_project_material_usage(project_id, cost_date);

CREATE INDEX IF NOT EXISTS idx_project_service_usage_project_cost_date
    ON public.t_project_service_usage(project_id, cost_date);

CREATE INDEX IF NOT EXISTS idx_project_vehicle_costs_project_cost_date
    ON public.t_project_vehicle_costs(project_id, cost_date);

CREATE INDEX IF NOT EXISTS idx_project_costs_extra_project_cost_date
    ON public.t_project_costs_extra(project_id, cost_date);

CREATE INDEX IF NOT EXISTS idx_project_bnk_costs_project_cost_date
    ON public.t_project_bnk_costs(project_id, cost_date);
