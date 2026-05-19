-- +goose Up
-- MVP Carpinteria: catalogo, clientes, proyectos, muebles y cotizaciones.

CREATE TABLE IF NOT EXISTS carpentry_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID,
  category TEXT NOT NULL CHECK (category IN ('board','edge_band','hardware','accessory','labor')),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_mxn NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_materials_owner ON carpentry_materials(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_carpentry_materials_category ON carpentry_materials(category);

CREATE TABLE IF NOT EXISTS carpentry_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_clients_owner ON carpentry_clients(user_id, org_id);

CREATE TABLE IF NOT EXISTS carpentry_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID,
  client_id UUID REFERENCES carpentry_clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','quoted','approved','in_progress','completed','cancelled')),
  project_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quote_valid_until DATE,
  notes TEXT NOT NULL DEFAULT '',
  margin_percent NUMERIC(6,4) NOT NULL DEFAULT 0.35,
  advance_percent NUMERIC(6,4) NOT NULL DEFAULT 0.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_projects_owner ON carpentry_projects(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_carpentry_projects_status ON carpentry_projects(status);

CREATE TABLE IF NOT EXISTS carpentry_project_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES carpentry_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_env_project ON carpentry_project_environments(project_id, position);

CREATE TABLE IF NOT EXISTS carpentry_furniture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES carpentry_project_environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  width_mm INT NOT NULL DEFAULT 0,
  height_mm INT NOT NULL DEFAULT 0,
  depth_mm INT NOT NULL DEFAULT 0,
  waste_percent NUMERIC(6,4) NOT NULL DEFAULT 0.10,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_furniture_environment ON carpentry_furniture_items(environment_id, position);

CREATE TABLE IF NOT EXISTS carpentry_furniture_cost_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  furniture_id UUID NOT NULL REFERENCES carpentry_furniture_items(id) ON DELETE CASCADE,
  material_id UUID REFERENCES carpentry_materials(id) ON DELETE SET NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('material','hardware','accessory','labor')),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_cost_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_cost_lines_furniture ON carpentry_furniture_cost_lines(furniture_id);

CREATE TABLE IF NOT EXISTS carpentry_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID,
  project_id UUID NOT NULL REFERENCES carpentry_projects(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  waste_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpentry_quotes_project ON carpentry_quotes(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carpentry_quotes_owner ON carpentry_quotes(user_id, org_id);

-- +goose Down
DROP TABLE IF EXISTS carpentry_quotes;
DROP TABLE IF EXISTS carpentry_furniture_cost_lines;
DROP TABLE IF EXISTS carpentry_furniture_items;
DROP TABLE IF EXISTS carpentry_project_environments;
DROP TABLE IF EXISTS carpentry_projects;
DROP TABLE IF EXISTS carpentry_clients;
DROP TABLE IF EXISTS carpentry_materials;
