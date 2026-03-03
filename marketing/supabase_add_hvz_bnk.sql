CREATE TABLE IF NOT EXISTS t_project_hvz_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
    datum_von DATE,
    datum_bis DATE,
    tage NUMERIC,
    ek_preis NUMERIC NOT NULL DEFAULT 0,
    vk_preis NUMERIC NOT NULL DEFAULT 0,
    is_kv BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_project_bnk_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
    beschreibung TEXT,
    menge NUMERIC,
    ek_preis NUMERIC NOT NULL DEFAULT 0,
    vk_preis NUMERIC NOT NULL DEFAULT 0,
    is_kv BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies can be added later if needed.
