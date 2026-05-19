package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const materialColumns = `id, user_id, org_id, category, name, unit, unit_cost_mxn, supplier, notes, active, created_at, updated_at`
const clientColumns = `id, user_id, org_id, name, phone, email, address, notes, created_at, updated_at`
const projectColumns = `id, user_id, org_id, client_id, name, status, project_date, quote_valid_until, notes, margin_percent, advance_percent, created_at, updated_at`
const envColumns = `id, project_id, name, notes, position, created_at, updated_at`
const furnitureColumns = `id, environment_id, name, description, width_mm, height_mm, depth_mm, waste_percent, position, created_at, updated_at`
const costLineColumns = `id, furniture_id, material_id, line_type, name, unit, quantity, unit_cost_snapshot, notes, created_at, updated_at`
const quoteColumns = `id, user_id, org_id, project_id, quote_number, snapshot, material_cost, waste_cost, labor_cost, base_cost, margin_amount, total, advance, valid_until, notes, created_at`

type Material struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	OrgID       *uuid.UUID `json:"org_id,omitempty"`
	Category    string     `json:"category"`
	Name        string     `json:"name"`
	Unit        string     `json:"unit"`
	UnitCostMXN float64    `json:"unit_cost_mxn"`
	Supplier    *string    `json:"supplier,omitempty"`
	Notes       string     `json:"notes"`
	Active      bool       `json:"active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateMaterialInput struct {
	Category    string  `json:"category"`
	Name        string  `json:"name"`
	Unit        string  `json:"unit"`
	UnitCostMXN float64 `json:"unit_cost_mxn"`
	Supplier    *string `json:"supplier"`
	Notes       string  `json:"notes"`
	Active      *bool   `json:"active"`
}

type UpdateMaterialInput struct {
	Category    *string  `json:"category"`
	Name        *string  `json:"name"`
	Unit        *string  `json:"unit"`
	UnitCostMXN *float64 `json:"unit_cost_mxn"`
	Supplier    *string  `json:"supplier"`
	Notes       *string  `json:"notes"`
	Active      *bool    `json:"active"`
}

type Client struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	OrgID     *uuid.UUID `json:"org_id,omitempty"`
	Name      string     `json:"name"`
	Phone     *string    `json:"phone,omitempty"`
	Email     *string    `json:"email,omitempty"`
	Address   *string    `json:"address,omitempty"`
	Notes     string     `json:"notes"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CreateClientInput struct {
	Name    string  `json:"name"`
	Phone   *string `json:"phone"`
	Email   *string `json:"email"`
	Address *string `json:"address"`
	Notes   string  `json:"notes"`
}

type UpdateClientInput struct {
	Name    *string `json:"name"`
	Phone   *string `json:"phone"`
	Email   *string `json:"email"`
	Address *string `json:"address"`
	Notes   *string `json:"notes"`
}

type Project struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	OrgID           *uuid.UUID `json:"org_id,omitempty"`
	ClientID        *uuid.UUID `json:"client_id,omitempty"`
	Name            string     `json:"name"`
	Status          string     `json:"status"`
	ProjectDate     time.Time  `json:"project_date"`
	QuoteValidUntil *time.Time `json:"quote_valid_until,omitempty"`
	Notes           string     `json:"notes"`
	MarginPercent   float64    `json:"margin_percent"`
	AdvancePercent  float64    `json:"advance_percent"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreateProjectInput struct {
	ClientID        *uuid.UUID `json:"client_id"`
	Name            string     `json:"name"`
	Status          string     `json:"status"`
	ProjectDate     *time.Time `json:"project_date"`
	QuoteValidUntil *time.Time `json:"quote_valid_until"`
	Notes           string     `json:"notes"`
	MarginPercent   *float64   `json:"margin_percent"`
	AdvancePercent  *float64   `json:"advance_percent"`
}

type UpdateProjectInput struct {
	ClientID        *uuid.UUID `json:"client_id"`
	Name            *string    `json:"name"`
	Status          *string    `json:"status"`
	ProjectDate     *time.Time `json:"project_date"`
	QuoteValidUntil *time.Time `json:"quote_valid_until"`
	Notes           *string    `json:"notes"`
	MarginPercent   *float64   `json:"margin_percent"`
	AdvancePercent  *float64   `json:"advance_percent"`
}

type ProjectEnvironment struct {
	ID        uuid.UUID        `json:"id"`
	ProjectID uuid.UUID       `json:"project_id"`
	Name      string           `json:"name"`
	Notes     string           `json:"notes"`
	Position  int              `json:"position"`
	Furniture []*FurnitureItem `json:"furniture,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

type FurnitureItem struct {
	ID           uuid.UUID   `json:"id"`
	EnvironmentID uuid.UUID `json:"environment_id"`
	Name         string      `json:"name"`
	Description  string      `json:"description"`
	WidthMM      int         `json:"width_mm"`
	HeightMM     int         `json:"height_mm"`
	DepthMM      int         `json:"depth_mm"`
	WastePercent float64     `json:"waste_percent"`
	Position     int         `json:"position"`
	CostLines    []*CostLine `json:"cost_lines,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type CostLine struct {
	ID               uuid.UUID  `json:"id"`
	FurnitureID      uuid.UUID  `json:"furniture_id"`
	MaterialID       *uuid.UUID `json:"material_id,omitempty"`
	LineType         string     `json:"line_type"`
	Name             string     `json:"name"`
	Unit             string     `json:"unit"`
	Quantity         float64    `json:"quantity"`
	UnitCostSnapshot float64    `json:"unit_cost_snapshot"`
	Notes            string     `json:"notes"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateEnvironmentInput struct {
	Name     string `json:"name"`
	Notes    string `json:"notes"`
	Position int    `json:"position"`
}

type UpdateEnvironmentInput struct {
	Name     *string `json:"name"`
	Notes    *string `json:"notes"`
	Position *int    `json:"position"`
}

type CreateFurnitureInput struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	WidthMM      int      `json:"width_mm"`
	HeightMM     int      `json:"height_mm"`
	DepthMM      int      `json:"depth_mm"`
	WastePercent *float64 `json:"waste_percent"`
	Position     int      `json:"position"`
}

type UpdateFurnitureInput struct {
	Name         *string  `json:"name"`
	Description  *string  `json:"description"`
	WidthMM      *int     `json:"width_mm"`
	HeightMM     *int     `json:"height_mm"`
	DepthMM      *int     `json:"depth_mm"`
	WastePercent *float64 `json:"waste_percent"`
	Position     *int     `json:"position"`
}

type CreateCostLineInput struct {
	MaterialID       *uuid.UUID `json:"material_id"`
	LineType         string     `json:"line_type"`
	Name             string     `json:"name"`
	Unit             string     `json:"unit"`
	Quantity         float64    `json:"quantity"`
	UnitCostSnapshot *float64   `json:"unit_cost_snapshot"`
	Notes            string     `json:"notes"`
}

type UpdateCostLineInput struct {
	MaterialID       *uuid.UUID `json:"material_id"`
	LineType         *string    `json:"line_type"`
	Name             *string    `json:"name"`
	Unit             *string    `json:"unit"`
	Quantity         *float64   `json:"quantity"`
	UnitCostSnapshot *float64   `json:"unit_cost_snapshot"`
	Notes            *string    `json:"notes"`
}

type ProjectTotals struct {
	MaterialCost float64 `json:"material_cost"`
	WasteCost    float64 `json:"waste_cost"`
	LaborCost    float64 `json:"labor_cost"`
	BaseCost     float64 `json:"base_cost"`
	MarginAmount float64 `json:"margin_amount"`
	Total        float64 `json:"total"`
	Advance      float64 `json:"advance"`
}

type ProjectDetail struct {
	Project      *Project              `json:"project"`
	Client       *Client               `json:"client,omitempty"`
	Environments []*ProjectEnvironment `json:"environments"`
	Totals       ProjectTotals         `json:"totals"`
	LatestQuote  *Quote                `json:"latest_quote,omitempty"`
}

type Quote struct {
	ID           uuid.UUID       `json:"id"`
	UserID       uuid.UUID       `json:"user_id"`
	OrgID        *uuid.UUID      `json:"org_id,omitempty"`
	ProjectID    uuid.UUID       `json:"project_id"`
	QuoteNumber  string          `json:"quote_number"`
	Snapshot     json.RawMessage `json:"snapshot"`
	Project      *ProjectDetail  `json:"project,omitempty"`
	MaterialCost float64         `json:"material_cost"`
	WasteCost    float64         `json:"waste_cost"`
	LaborCost    float64         `json:"labor_cost"`
	BaseCost     float64         `json:"base_cost"`
	MarginAmount float64         `json:"margin_amount"`
	Total        float64         `json:"total"`
	Advance      float64         `json:"advance"`
	ValidUntil   *time.Time      `json:"valid_until,omitempty"`
	Notes        string          `json:"notes"`
	CreatedAt    time.Time       `json:"created_at"`
}

type CarpentryDashboard struct {
	OpenProjects int        `json:"open_projects"`
	QuotedCount  int        `json:"quoted_count"`
	TotalQuoted  float64    `json:"total_quoted"`
	Recent       []*Project `json:"recent_projects"`
}

func scanMaterial(row pgx.Row) (*Material, error) {
	var m Material
	err := row.Scan(&m.ID, &m.UserID, &m.OrgID, &m.Category, &m.Name, &m.Unit, &m.UnitCostMXN, &m.Supplier, &m.Notes, &m.Active, &m.CreatedAt, &m.UpdatedAt)
	return &m, err
}

func scanClient(row pgx.Row) (*Client, error) {
	var c Client
	err := row.Scan(&c.ID, &c.UserID, &c.OrgID, &c.Name, &c.Phone, &c.Email, &c.Address, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func scanProject(row pgx.Row) (*Project, error) {
	var p Project
	err := row.Scan(&p.ID, &p.UserID, &p.OrgID, &p.ClientID, &p.Name, &p.Status, &p.ProjectDate, &p.QuoteValidUntil, &p.Notes, &p.MarginPercent, &p.AdvancePercent, &p.CreatedAt, &p.UpdatedAt)
	return &p, err
}

func scanEnvironment(row pgx.Row) (*ProjectEnvironment, error) {
	var e ProjectEnvironment
	err := row.Scan(&e.ID, &e.ProjectID, &e.Name, &e.Notes, &e.Position, &e.CreatedAt, &e.UpdatedAt)
	return &e, err
}

func scanFurniture(row pgx.Row) (*FurnitureItem, error) {
	var f FurnitureItem
	err := row.Scan(&f.ID, &f.EnvironmentID, &f.Name, &f.Description, &f.WidthMM, &f.HeightMM, &f.DepthMM, &f.WastePercent, &f.Position, &f.CreatedAt, &f.UpdatedAt)
	return &f, err
}

func scanCostLine(row pgx.Row) (*CostLine, error) {
	var l CostLine
	err := row.Scan(&l.ID, &l.FurnitureID, &l.MaterialID, &l.LineType, &l.Name, &l.Unit, &l.Quantity, &l.UnitCostSnapshot, &l.Notes, &l.CreatedAt, &l.UpdatedAt)
	return &l, err
}

func scanQuote(row pgx.Row) (*Quote, error) {
	var q Quote
	err := row.Scan(&q.ID, &q.UserID, &q.OrgID, &q.ProjectID, &q.QuoteNumber, &q.Snapshot, &q.MaterialCost, &q.WasteCost, &q.LaborCost, &q.BaseCost, &q.MarginAmount, &q.Total, &q.Advance, &q.ValidUntil, &q.Notes, &q.CreatedAt)
	return &q, err
}

func (s *Store) CarpentryDashboard(ctx context.Context) (*CarpentryDashboard, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	var out CarpentryDashboard
	if err := s.Reader().QueryRow(ctx, `SELECT COUNT(*) FROM carpentry_projects WHERE status IN ('draft','quoted','approved','in_progress') AND `+scopeSQL, scopeArgs...).Scan(&out.OpenProjects); err != nil {
		return nil, err
	}
	if err := s.Reader().QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM carpentry_quotes WHERE `+scopeSQL, scopeArgs...).Scan(&out.QuotedCount, &out.TotalQuoted); err != nil {
		return nil, err
	}
	projects, err := s.ListCarpentryProjects(ctx)
	if err != nil {
		return nil, err
	}
	if len(projects) > 5 {
		projects = projects[:5]
	}
	out.Recent = projects
	return &out, nil
}

func (s *Store) ListMaterials(ctx context.Context, category string, includeInactive bool) ([]*Material, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	args := append([]any{}, scopeArgs...)
	where := []string{scopeSQL}
	if category != "" {
		args = append(args, category)
		where = append(where, fmt.Sprintf("category = $%d", len(args)))
	}
	if !includeInactive {
		where = append(where, "active = TRUE")
	}
	rows, err := s.Reader().Query(ctx, `SELECT `+materialColumns+` FROM carpentry_materials WHERE `+joinAnd(where)+` ORDER BY category, name`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Material{}
	for rows.Next() {
		m, err := scanMaterial(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) CreateMaterial(ctx context.Context, in CreateMaterialInput) (*Material, error) {
	userID, _ := currentUserID(ctx)
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	row := s.Writer().QueryRow(ctx, `INSERT INTO carpentry_materials (user_id, org_id, category, name, unit, unit_cost_mxn, supplier, notes, active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING `+materialColumns,
		userID, currentOrgIDPtr(ctx), in.Category, in.Name, in.Unit, in.UnitCostMXN, in.Supplier, in.Notes, active)
	return scanMaterial(row)
}

func (s *Store) UpdateMaterial(ctx context.Context, id uuid.UUID, in UpdateMaterialInput) (*Material, error) {
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.Category != nil { add("category", *in.Category) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Unit != nil { add("unit", *in.Unit) }
	if in.UnitCostMXN != nil { add("unit_cost_mxn", *in.UnitCostMXN) }
	if in.Supplier != nil { add("supplier", *in.Supplier) }
	if in.Notes != nil { add("notes", *in.Notes) }
	if in.Active != nil { add("active", *in.Active) }
	if len(sets) == 0 {
		return s.GetMaterial(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	idIdx := len(args)
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idIdx+1)
	args = append(args, scopeArgs...)
	m, err := scanMaterial(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_materials SET %s WHERE id = $%d AND %s RETURNING %s`, joinComma(sets), idIdx, scopeSQL, materialColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return m, err
}

func (s *Store) GetMaterial(ctx context.Context, id uuid.UUID) (*Material, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	m, err := scanMaterial(s.Reader().QueryRow(ctx, `SELECT `+materialColumns+` FROM carpentry_materials WHERE id = $1 AND `+scopeSQL, args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return m, err
}

func (s *Store) ListClients(ctx context.Context) ([]*Client, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	rows, err := s.Reader().Query(ctx, `SELECT `+clientColumns+` FROM carpentry_clients WHERE `+scopeSQL+` ORDER BY updated_at DESC, name`, scopeArgs...)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*Client{}
	for rows.Next() {
		c, err := scanClient(rows); if err != nil { return nil, err }
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) CreateClient(ctx context.Context, in CreateClientInput) (*Client, error) {
	userID, _ := currentUserID(ctx)
	return scanClient(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_clients (user_id, org_id, name, phone, email, address, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING `+clientColumns,
		userID, currentOrgIDPtr(ctx), in.Name, in.Phone, in.Email, in.Address, in.Notes))
}

func (s *Store) UpdateClient(ctx context.Context, id uuid.UUID, in UpdateClientInput) (*Client, error) {
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Phone != nil { add("phone", *in.Phone) }
	if in.Email != nil { add("email", *in.Email) }
	if in.Address != nil { add("address", *in.Address) }
	if in.Notes != nil { add("notes", *in.Notes) }
	if len(sets) == 0 { return s.GetClient(ctx, id) }
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	idIdx := len(args)
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idIdx+1)
	args = append(args, scopeArgs...)
	c, err := scanClient(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_clients SET %s WHERE id = $%d AND %s RETURNING %s`, joinComma(sets), idIdx, scopeSQL, clientColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return c, err
}

func (s *Store) GetClient(ctx context.Context, id uuid.UUID) (*Client, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	c, err := scanClient(s.Reader().QueryRow(ctx, `SELECT `+clientColumns+` FROM carpentry_clients WHERE id = $1 AND `+scopeSQL, args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return c, err
}

func (s *Store) ListCarpentryProjects(ctx context.Context) ([]*Project, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	rows, err := s.Reader().Query(ctx, `SELECT `+projectColumns+` FROM carpentry_projects WHERE `+scopeSQL+` ORDER BY updated_at DESC, created_at DESC`, scopeArgs...)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*Project{}
	for rows.Next() {
		p, err := scanProject(rows); if err != nil { return nil, err }
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) CreateCarpentryProject(ctx context.Context, in CreateProjectInput) (*Project, error) {
	userID, _ := currentUserID(ctx)
	status := in.Status
	if status == "" { status = "draft" }
	margin, advance := 0.35, 0.50
	if in.MarginPercent != nil { margin = *in.MarginPercent }
	if in.AdvancePercent != nil { advance = *in.AdvancePercent }
	return scanProject(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_projects (user_id, org_id, client_id, name, status, project_date, quote_valid_until, notes, margin_percent, advance_percent)
		VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),$7,$8,$9,$10) RETURNING `+projectColumns,
		userID, currentOrgIDPtr(ctx), in.ClientID, in.Name, status, in.ProjectDate, in.QuoteValidUntil, in.Notes, margin, advance))
}

func (s *Store) UpdateCarpentryProject(ctx context.Context, id uuid.UUID, in UpdateProjectInput) (*Project, error) {
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.ClientID != nil { add("client_id", *in.ClientID) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Status != nil { add("status", *in.Status) }
	if in.ProjectDate != nil { add("project_date", *in.ProjectDate) }
	if in.QuoteValidUntil != nil { add("quote_valid_until", *in.QuoteValidUntil) }
	if in.Notes != nil { add("notes", *in.Notes) }
	if in.MarginPercent != nil { add("margin_percent", *in.MarginPercent) }
	if in.AdvancePercent != nil { add("advance_percent", *in.AdvancePercent) }
	if len(sets) == 0 { return s.GetCarpentryProject(ctx, id) }
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	idIdx := len(args)
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idIdx+1)
	args = append(args, scopeArgs...)
	p, err := scanProject(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_projects SET %s WHERE id = $%d AND %s RETURNING %s`, joinComma(sets), idIdx, scopeSQL, projectColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return p, err
}

func (s *Store) GetCarpentryProject(ctx context.Context, id uuid.UUID) (*Project, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	p, err := scanProject(s.Reader().QueryRow(ctx, `SELECT `+projectColumns+` FROM carpentry_projects WHERE id = $1 AND `+scopeSQL, args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return p, err
}

func (s *Store) GetCarpentryProjectDetail(ctx context.Context, id uuid.UUID) (*ProjectDetail, error) {
	project, err := s.GetCarpentryProject(ctx, id)
	if err != nil { return nil, err }
	var client *Client
	if project.ClientID != nil {
		client, _ = s.GetClient(ctx, *project.ClientID)
	}
	envs, err := s.listEnvironments(ctx, id)
	if err != nil { return nil, err }
	for _, env := range envs {
		furniture, err := s.listFurniture(ctx, env.ID)
		if err != nil { return nil, err }
		for _, f := range furniture {
			lines, err := s.listCostLines(ctx, f.ID)
			if err != nil { return nil, err }
			f.CostLines = lines
		}
		env.Furniture = furniture
	}
	totals := calculateTotals(project, envs)
	latest, _ := s.latestQuote(ctx, id)
	return &ProjectDetail{Project: project, Client: client, Environments: envs, Totals: totals, LatestQuote: latest}, nil
}

func (s *Store) CreateEnvironment(ctx context.Context, projectID uuid.UUID, in CreateEnvironmentInput) (*ProjectEnvironment, error) {
	if _, err := s.GetCarpentryProject(ctx, projectID); err != nil { return nil, err }
	return scanEnvironment(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_project_environments (project_id, name, notes, position) VALUES ($1,$2,$3,$4) RETURNING `+envColumns, projectID, in.Name, in.Notes, in.Position))
}

func (s *Store) UpdateEnvironment(ctx context.Context, id uuid.UUID, in UpdateEnvironmentInput) (*ProjectEnvironment, error) {
	if err := s.authorizeEnvironment(ctx, id); err != nil { return nil, err }
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Notes != nil { add("notes", *in.Notes) }
	if in.Position != nil { add("position", *in.Position) }
	if len(sets) == 0 { return s.getEnvironment(ctx, id) }
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	e, err := scanEnvironment(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_project_environments SET %s WHERE id = $%d RETURNING %s`, joinComma(sets), len(args), envColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return e, err
}

func (s *Store) DeleteEnvironment(ctx context.Context, id uuid.UUID) error {
	if err := s.authorizeEnvironment(ctx, id); err != nil { return err }
	res, err := s.Writer().Exec(ctx, `DELETE FROM carpentry_project_environments WHERE id = $1`, id)
	if err != nil { return err }
	if res.RowsAffected() == 0 { return ErrNotFound }
	return nil
}

func (s *Store) CreateFurniture(ctx context.Context, envID uuid.UUID, in CreateFurnitureInput) (*FurnitureItem, error) {
	if err := s.authorizeEnvironment(ctx, envID); err != nil { return nil, err }
	waste := 0.10
	if in.WastePercent != nil { waste = *in.WastePercent }
	return scanFurniture(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_furniture_items (environment_id, name, description, width_mm, height_mm, depth_mm, waste_percent, position)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+furnitureColumns, envID, in.Name, in.Description, in.WidthMM, in.HeightMM, in.DepthMM, waste, in.Position))
}

func (s *Store) UpdateFurniture(ctx context.Context, id uuid.UUID, in UpdateFurnitureInput) (*FurnitureItem, error) {
	if err := s.authorizeFurniture(ctx, id); err != nil { return nil, err }
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Description != nil { add("description", *in.Description) }
	if in.WidthMM != nil { add("width_mm", *in.WidthMM) }
	if in.HeightMM != nil { add("height_mm", *in.HeightMM) }
	if in.DepthMM != nil { add("depth_mm", *in.DepthMM) }
	if in.WastePercent != nil { add("waste_percent", *in.WastePercent) }
	if in.Position != nil { add("position", *in.Position) }
	if len(sets) == 0 { return s.getFurniture(ctx, id) }
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	f, err := scanFurniture(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_furniture_items SET %s WHERE id = $%d RETURNING %s`, joinComma(sets), len(args), furnitureColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return f, err
}

func (s *Store) DeleteFurniture(ctx context.Context, id uuid.UUID) error {
	if err := s.authorizeFurniture(ctx, id); err != nil { return err }
	res, err := s.Writer().Exec(ctx, `DELETE FROM carpentry_furniture_items WHERE id = $1`, id)
	if err != nil { return err }
	if res.RowsAffected() == 0 { return ErrNotFound }
	return nil
}

func (s *Store) CreateCostLine(ctx context.Context, furnitureID uuid.UUID, in CreateCostLineInput) (*CostLine, error) {
	if err := s.authorizeFurniture(ctx, furnitureID); err != nil { return nil, err }
	if in.MaterialID != nil && (in.Name == "" || in.Unit == "" || in.UnitCostSnapshot == nil) {
		m, err := s.GetMaterial(ctx, *in.MaterialID)
		if err != nil { return nil, err }
		if in.Name == "" { in.Name = m.Name }
		if in.Unit == "" { in.Unit = m.Unit }
		if in.UnitCostSnapshot == nil { in.UnitCostSnapshot = &m.UnitCostMXN }
	}
	if in.Quantity == 0 { in.Quantity = 1 }
	unitCost := 0.0
	if in.UnitCostSnapshot != nil { unitCost = *in.UnitCostSnapshot }
	return scanCostLine(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_furniture_cost_lines (furniture_id, material_id, line_type, name, unit, quantity, unit_cost_snapshot, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+costLineColumns, furnitureID, in.MaterialID, in.LineType, in.Name, in.Unit, in.Quantity, unitCost, in.Notes))
}

func (s *Store) UpdateCostLine(ctx context.Context, id uuid.UUID, in UpdateCostLineInput) (*CostLine, error) {
	if err := s.authorizeCostLine(ctx, id); err != nil { return nil, err }
	sets, args := []string{}, []any{}
	add := func(name string, v any) { args = append(args, v); sets = append(sets, fmt.Sprintf("%s = $%d", name, len(args))) }
	if in.MaterialID != nil { add("material_id", *in.MaterialID) }
	if in.LineType != nil { add("line_type", *in.LineType) }
	if in.Name != nil { add("name", *in.Name) }
	if in.Unit != nil { add("unit", *in.Unit) }
	if in.Quantity != nil { add("quantity", *in.Quantity) }
	if in.UnitCostSnapshot != nil { add("unit_cost_snapshot", *in.UnitCostSnapshot) }
	if in.Notes != nil { add("notes", *in.Notes) }
	if len(sets) == 0 { return s.getCostLine(ctx, id) }
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	l, err := scanCostLine(s.Writer().QueryRow(ctx, fmt.Sprintf(`UPDATE carpentry_furniture_cost_lines SET %s WHERE id = $%d RETURNING %s`, joinComma(sets), len(args), costLineColumns), args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return l, err
}

func (s *Store) DeleteCostLine(ctx context.Context, id uuid.UUID) error {
	if err := s.authorizeCostLine(ctx, id); err != nil { return err }
	res, err := s.Writer().Exec(ctx, `DELETE FROM carpentry_furniture_cost_lines WHERE id = $1`, id)
	if err != nil { return err }
	if res.RowsAffected() == 0 { return ErrNotFound }
	return nil
}

func (s *Store) CreateProjectQuote(ctx context.Context, projectID uuid.UUID, notes string) (*Quote, error) {
	detail, err := s.GetCarpentryProjectDetail(ctx, projectID)
	if err != nil { return nil, err }
	raw, err := json.Marshal(detail)
	if err != nil { return nil, err }
	userID, _ := currentUserID(ctx)
	number := fmt.Sprintf("COT-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
	t := detail.Totals
	q, err := scanQuote(s.Writer().QueryRow(ctx, `INSERT INTO carpentry_quotes (user_id, org_id, project_id, quote_number, snapshot, material_cost, waste_cost, labor_cost, base_cost, margin_amount, total, advance, valid_until, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING `+quoteColumns,
		userID, currentOrgIDPtr(ctx), projectID, number, raw, t.MaterialCost, t.WasteCost, t.LaborCost, t.BaseCost, t.MarginAmount, t.Total, t.Advance, detail.Project.QuoteValidUntil, notes))
	if err != nil { return nil, err }
	q.Project = detail
	_, _ = s.Writer().Exec(ctx, `UPDATE carpentry_projects SET status = 'quoted', updated_at = NOW() WHERE id = $1`, projectID)
	return q, nil
}

func (s *Store) GetQuote(ctx context.Context, id uuid.UUID) (*Quote, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	q, err := scanQuote(s.Reader().QueryRow(ctx, `SELECT `+quoteColumns+` FROM carpentry_quotes WHERE id = $1 AND `+scopeSQL, args...))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return q, err
}

func (s *Store) ListQuotes(ctx context.Context) ([]*Quote, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	rows, err := s.Reader().Query(ctx, `SELECT `+quoteColumns+` FROM carpentry_quotes WHERE `+scopeSQL+` ORDER BY created_at DESC`, scopeArgs...)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*Quote{}
	for rows.Next() {
		q, err := scanQuote(rows); if err != nil { return nil, err }
		out = append(out, q)
	}
	return out, rows.Err()
}

func (s *Store) listEnvironments(ctx context.Context, projectID uuid.UUID) ([]*ProjectEnvironment, error) {
	rows, err := s.Reader().Query(ctx, `SELECT `+envColumns+` FROM carpentry_project_environments WHERE project_id = $1 ORDER BY position, created_at`, projectID)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*ProjectEnvironment{}
	for rows.Next() {
		e, err := scanEnvironment(rows); if err != nil { return nil, err }
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) listFurniture(ctx context.Context, envID uuid.UUID) ([]*FurnitureItem, error) {
	rows, err := s.Reader().Query(ctx, `SELECT `+furnitureColumns+` FROM carpentry_furniture_items WHERE environment_id = $1 ORDER BY position, created_at`, envID)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*FurnitureItem{}
	for rows.Next() {
		f, err := scanFurniture(rows); if err != nil { return nil, err }
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Store) listCostLines(ctx context.Context, furnitureID uuid.UUID) ([]*CostLine, error) {
	rows, err := s.Reader().Query(ctx, `SELECT `+costLineColumns+` FROM carpentry_furniture_cost_lines WHERE furniture_id = $1 ORDER BY created_at`, furnitureID)
	if err != nil { return nil, err }
	defer rows.Close()
	out := []*CostLine{}
	for rows.Next() {
		l, err := scanCostLine(rows); if err != nil { return nil, err }
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Store) latestQuote(ctx context.Context, projectID uuid.UUID) (*Quote, error) {
	q, err := scanQuote(s.Reader().QueryRow(ctx, `SELECT `+quoteColumns+` FROM carpentry_quotes WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`, projectID))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return q, err
}

func (s *Store) getEnvironment(ctx context.Context, id uuid.UUID) (*ProjectEnvironment, error) {
	e, err := scanEnvironment(s.Reader().QueryRow(ctx, `SELECT `+envColumns+` FROM carpentry_project_environments WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return e, err
}

func (s *Store) getFurniture(ctx context.Context, id uuid.UUID) (*FurnitureItem, error) {
	f, err := scanFurniture(s.Reader().QueryRow(ctx, `SELECT `+furnitureColumns+` FROM carpentry_furniture_items WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return f, err
}

func (s *Store) getCostLine(ctx context.Context, id uuid.UUID) (*CostLine, error) {
	l, err := scanCostLine(s.Reader().QueryRow(ctx, `SELECT `+costLineColumns+` FROM carpentry_furniture_cost_lines WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
	return l, err
}

func (s *Store) authorizeEnvironment(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "p.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	var exists bool
	err := s.Reader().QueryRow(ctx, `SELECT TRUE FROM carpentry_project_environments e JOIN carpentry_projects p ON p.id = e.project_id WHERE e.id = $1 AND `+scopeSQL, args...).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
	return err
}

func (s *Store) authorizeFurniture(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "p.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	var exists bool
	err := s.Reader().QueryRow(ctx, `SELECT TRUE FROM carpentry_furniture_items f JOIN carpentry_project_environments e ON e.id = f.environment_id JOIN carpentry_projects p ON p.id = e.project_id WHERE f.id = $1 AND `+scopeSQL, args...).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
	return err
}

func (s *Store) authorizeCostLine(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "p.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	var exists bool
	err := s.Reader().QueryRow(ctx, `SELECT TRUE FROM carpentry_furniture_cost_lines l JOIN carpentry_furniture_items f ON f.id = l.furniture_id JOIN carpentry_project_environments e ON e.id = f.environment_id JOIN carpentry_projects p ON p.id = e.project_id WHERE l.id = $1 AND `+scopeSQL, args...).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
	return err
}

func calculateTotals(project *Project, envs []*ProjectEnvironment) ProjectTotals {
	var t ProjectTotals
	for _, env := range envs {
		for _, f := range env.Furniture {
			var furnitureMaterial float64
			for _, line := range f.CostLines {
				amount := line.Quantity * line.UnitCostSnapshot
				if line.LineType == "labor" {
					t.LaborCost += amount
				} else {
					t.MaterialCost += amount
					furnitureMaterial += amount
				}
			}
			t.WasteCost += furnitureMaterial * f.WastePercent
		}
	}
	t.BaseCost = t.MaterialCost + t.WasteCost + t.LaborCost
	t.MarginAmount = t.BaseCost * project.MarginPercent
	t.Total = t.BaseCost + t.MarginAmount
	t.Advance = t.Total * project.AdvancePercent
	return t
}

func joinAnd(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 { out += " AND " }
		out += p
	}
	return out
}
