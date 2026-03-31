-- Migration: Add BNK-style columns to t_project_costs_extra
-- Run this in the Supabase SQL editor

ALTER TABLE public.t_project_costs_extra
  ADD COLUMN IF NOT EXISTS beschreibung text,
  ADD COLUMN IF NOT EXISTS menge numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ek_preis numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_preis numeric DEFAULT 0;

-- Backfill: migrate existing rows so beschreibung = cost_type or description, ek_preis = cost, menge = 1
UPDATE public.t_project_costs_extra
SET
  beschreibung = COALESCE(NULLIF(cost_type, ''), description, ''),
  menge = 1,
  ek_preis = COALESCE(cost, 0),
  vk_preis = 0
WHERE beschreibung IS NULL;
