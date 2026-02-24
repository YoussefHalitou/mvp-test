/*
  Custom Columns Migration
  Run this SQL in your Supabase SQL Editor to add custom column support.
*/

-- Custom column definitions (shared across resource tabs)
create table public.t_custom_columns (
  id text primary key,
  table_name text not null,  -- 'employees', 'vehicles', 'materials', 'services'
  column_name text not null,
  column_type text not null default 'text',  -- 'text' or 'number'
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Custom column values (one row per record × column)
create table public.t_custom_column_data (
  id bigint generated always as identity primary key,
  custom_column_id text references public.t_custom_columns(id) on delete cascade,
  record_id text not null,  -- employee_id, vehicle_id, material_id, or service_id
  value text,
  unique(custom_column_id, record_id)
);

-- RLS policies (match existing "allow all" pattern)
alter table public.t_custom_columns enable row level security;
alter table public.t_custom_column_data enable row level security;
create policy "Enable all access" on public.t_custom_columns for all using (true);
create policy "Enable all access" on public.t_custom_column_data for all using (true);
