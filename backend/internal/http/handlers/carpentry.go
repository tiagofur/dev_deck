package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CarpentryHandler struct {
	store *store.Store
}

func NewCarpentryHandler(s *store.Store) *CarpentryHandler {
	return &CarpentryHandler{store: s}
}

func (h *CarpentryHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	out, err := h.store.CarpentryDashboard(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *CarpentryHandler) ListMaterials(w http.ResponseWriter, r *http.Request) {
	materials, err := h.store.ListMaterials(r.Context(), r.URL.Query().Get("category"), r.URL.Query().Get("include_inactive") == "true")
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"materials": materials})
}

func (h *CarpentryHandler) CreateMaterial(w http.ResponseWriter, r *http.Request) {
	var in store.CreateMaterialInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.Category == "" || in.Name == "" || in.Unit == "" {
		writeError(w, http.StatusBadRequest, "INVALID_MATERIAL", "category, name and unit are required")
		return
	}
	m, err := h.store.CreateMaterial(r.Context(), in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (h *CarpentryHandler) UpdateMaterial(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateMaterialInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	m, err := h.store.UpdateMaterial(r.Context(), id, in)
	writeCarpentryResult(w, m, err, "material not found")
}

func (h *CarpentryHandler) ListClients(w http.ResponseWriter, r *http.Request) {
	clients, err := h.store.ListClients(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"clients": clients})
}

func (h *CarpentryHandler) CreateClient(w http.ResponseWriter, r *http.Request) {
	var in store.CreateClientInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_CLIENT", "name is required")
		return
	}
	c, err := h.store.CreateClient(r.Context(), in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *CarpentryHandler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateClientInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	c, err := h.store.UpdateClient(r.Context(), id, in)
	writeCarpentryResult(w, c, err, "client not found")
}

func (h *CarpentryHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.store.ListCarpentryProjects(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

func (h *CarpentryHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var in store.CreateProjectInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_PROJECT", "name is required")
		return
	}
	p, err := h.store.CreateCarpentryProject(r.Context(), in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *CarpentryHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	detail, err := h.store.GetCarpentryProjectDetail(r.Context(), id)
	writeCarpentryResult(w, detail, err, "project not found")
}

func (h *CarpentryHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateProjectInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	p, err := h.store.UpdateCarpentryProject(r.Context(), id, in)
	writeCarpentryResult(w, p, err, "project not found")
}

func (h *CarpentryHandler) CreateEnvironment(w http.ResponseWriter, r *http.Request) {
	projectID, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.CreateEnvironmentInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_ENVIRONMENT", "name is required")
		return
	}
	env, err := h.store.CreateEnvironment(r.Context(), projectID, in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, env)
}

func (h *CarpentryHandler) UpdateEnvironment(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateEnvironmentInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	env, err := h.store.UpdateEnvironment(r.Context(), id, in)
	writeCarpentryResult(w, env, err, "environment not found")
}

func (h *CarpentryHandler) DeleteEnvironment(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	writeCarpentryDelete(w, h.store.DeleteEnvironment(r.Context(), id), "environment not found")
}

func (h *CarpentryHandler) CreateFurniture(w http.ResponseWriter, r *http.Request) {
	envID, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.CreateFurnitureInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_FURNITURE", "name is required")
		return
	}
	f, err := h.store.CreateFurniture(r.Context(), envID, in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, f)
}

func (h *CarpentryHandler) UpdateFurniture(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateFurnitureInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	f, err := h.store.UpdateFurniture(r.Context(), id, in)
	writeCarpentryResult(w, f, err, "furniture not found")
}

func (h *CarpentryHandler) DeleteFurniture(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	writeCarpentryDelete(w, h.store.DeleteFurniture(r.Context(), id), "furniture not found")
}

func (h *CarpentryHandler) CreateCostLine(w http.ResponseWriter, r *http.Request) {
	furnitureID, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.CreateCostLineInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	if in.LineType == "" || in.Name == "" && in.MaterialID == nil {
		writeError(w, http.StatusBadRequest, "INVALID_COST_LINE", "line_type and name/material_id are required")
		return
	}
	line, err := h.store.CreateCostLine(r.Context(), furnitureID, in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, line)
}

func (h *CarpentryHandler) UpdateCostLine(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var in store.UpdateCostLineInput
	if !decodeCarpentryBody(w, r, &in) {
		return
	}
	line, err := h.store.UpdateCostLine(r.Context(), id, in)
	writeCarpentryResult(w, line, err, "cost line not found")
}

func (h *CarpentryHandler) DeleteCostLine(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	writeCarpentryDelete(w, h.store.DeleteCostLine(r.Context(), id), "cost line not found")
}

func (h *CarpentryHandler) CreateQuote(w http.ResponseWriter, r *http.Request) {
	projectID, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	var body struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	q, err := h.store.CreateProjectQuote(r.Context(), projectID, body.Notes)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, q)
}

func (h *CarpentryHandler) ListQuotes(w http.ResponseWriter, r *http.Request) {
	quotes, err := h.store.ListQuotes(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"quotes": quotes})
}

func (h *CarpentryHandler) QuotePDF(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCarpentryID(w, r, "id")
	if !ok {
		return
	}
	q, err := h.store.GetQuote(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "quote not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}
	pdf := buildSimpleQuotePDF(q)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s.pdf"`, q.QuoteNumber))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdf)
}

func decodeCarpentryBody(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := decodeJSON(r, v); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return false
	}
	return true
}

func parseCarpentryID(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}

func writeCarpentryResult(w http.ResponseWriter, v any, err error, notFoundMsg string) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", notFoundMsg)
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func writeCarpentryDelete(w http.ResponseWriter, err error, notFoundMsg string) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", notFoundMsg)
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func buildSimpleQuotePDF(q *store.Quote) []byte {
	var projectName string
	var clientName string
	if len(q.Snapshot) > 0 {
		var snap struct {
			Project *store.Project `json:"project"`
			Client  *store.Client  `json:"client"`
		}
		_ = json.Unmarshal(q.Snapshot, &snap)
		if snap.Project != nil {
			projectName = snap.Project.Name
		}
		if snap.Client != nil {
			clientName = snap.Client.Name
		}
	}
	lines := []string{
		"COTIZACION " + q.QuoteNumber,
		"Proyecto: " + projectName,
		"Cliente: " + clientName,
		"Fecha: " + q.CreatedAt.Format("2006-01-02"),
		fmt.Sprintf("Total: $%.2f MXN", q.Total),
		fmt.Sprintf("Anticipo sugerido: $%.2f MXN", q.Advance),
	}
	if q.ValidUntil != nil {
		lines = append(lines, "Vigencia: "+q.ValidUntil.Format("2006-01-02"))
	}
	if q.Notes != "" {
		lines = append(lines, "Notas: "+q.Notes)
	}
	return minimalPDF(lines)
}

func minimalPDF(lines []string) []byte {
	escaped := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.ReplaceAll(line, `\`, `\\`)
		line = strings.ReplaceAll(line, `(`, `\(`)
		line = strings.ReplaceAll(line, `)`, `\)`)
		escaped = append(escaped, line)
	}
	stream := "BT /F1 16 Tf 72 760 Td "
	for i, line := range escaped {
		if i > 0 {
			stream += "0 -28 Td "
		}
		stream += "(" + line + ") Tj "
	}
	stream += "ET"
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(stream), stream),
	}
	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")
	offsets := []int{0}
	for i, obj := range objects {
		offsets = append(offsets, buf.Len())
		fmt.Fprintf(&buf, "%d 0 obj\n%s\nendobj\n", i+1, obj)
	}
	xref := buf.Len()
	fmt.Fprintf(&buf, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for i := 1; i < len(offsets); i++ {
		fmt.Fprintf(&buf, "%010d 00000 n \n", offsets[i])
	}
	fmt.Fprintf(&buf, "trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objects)+1, xref)
	return buf.Bytes()
}

var _ = authctx.UserID
