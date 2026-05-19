package handlers_test

import (
	"net/http"
	"testing"
)

func TestCarpentry_QuoteFlow_CalculatesAndSnapshots(t *testing.T) {
	ts := newTestServer(t)

	boardRec := ts.do(t, http.MethodPost, "/api/materials", map[string]any{
		"category":      "board",
		"name":          "Melamina blanca 18mm",
		"unit":          "pieza",
		"unit_cost_mxn": 1200,
	})
	if boardRec.Code != http.StatusCreated {
		t.Fatalf("create board: %d %s", boardRec.Code, boardRec.Body.String())
	}
	board := decodeJSON[struct {
		ID string `json:"id"`
	}](t, boardRec)

	clientRec := ts.do(t, http.MethodPost, "/api/clients", map[string]any{
		"name":  "Ana Lopez",
		"phone": "8112345678",
	})
	if clientRec.Code != http.StatusCreated {
		t.Fatalf("create client: %d %s", clientRec.Code, clientRec.Body.String())
	}
	client := decodeJSON[struct {
		ID string `json:"id"`
	}](t, clientRec)

	projectRec := ts.do(t, http.MethodPost, "/api/projects", map[string]any{
		"client_id":       client.ID,
		"name":            "Cocina integral",
		"margin_percent":  0.35,
		"advance_percent": 0.5,
	})
	if projectRec.Code != http.StatusCreated {
		t.Fatalf("create project: %d %s", projectRec.Code, projectRec.Body.String())
	}
	project := decodeJSON[struct {
		ID string `json:"id"`
	}](t, projectRec)

	envRec := ts.do(t, http.MethodPost, "/api/projects/"+project.ID+"/environments", map[string]any{
		"name": "Cocina",
	})
	if envRec.Code != http.StatusCreated {
		t.Fatalf("create environment: %d %s", envRec.Code, envRec.Body.String())
	}
	env := decodeJSON[struct {
		ID string `json:"id"`
	}](t, envRec)

	furnitureRec := ts.do(t, http.MethodPost, "/api/environments/"+env.ID+"/furniture", map[string]any{
		"name":          "Alacena",
		"width_mm":      1200,
		"height_mm":     900,
		"depth_mm":      350,
		"waste_percent": 0.10,
	})
	if furnitureRec.Code != http.StatusCreated {
		t.Fatalf("create furniture: %d %s", furnitureRec.Code, furnitureRec.Body.String())
	}
	furniture := decodeJSON[struct {
		ID string `json:"id"`
	}](t, furnitureRec)

	lineRec := ts.do(t, http.MethodPost, "/api/furniture/"+furniture.ID+"/cost-lines", map[string]any{
		"material_id": board.ID,
		"line_type":   "material",
		"quantity":    2,
	})
	if lineRec.Code != http.StatusCreated {
		t.Fatalf("create material line: %d %s", lineRec.Code, lineRec.Body.String())
	}
	laborRec := ts.do(t, http.MethodPost, "/api/furniture/"+furniture.ID+"/cost-lines", map[string]any{
		"line_type":          "labor",
		"name":               "Armado e instalacion",
		"unit":               "servicio",
		"quantity":           1,
		"unit_cost_snapshot": 800,
	})
	if laborRec.Code != http.StatusCreated {
		t.Fatalf("create labor line: %d %s", laborRec.Code, laborRec.Body.String())
	}

	detailRec := ts.do(t, http.MethodGet, "/api/projects/"+project.ID, nil)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("get project: %d %s", detailRec.Code, detailRec.Body.String())
	}
	detail := decodeJSON[struct {
		Totals struct {
			MaterialCost float64 `json:"material_cost"`
			WasteCost    float64 `json:"waste_cost"`
			LaborCost    float64 `json:"labor_cost"`
			BaseCost     float64 `json:"base_cost"`
			MarginAmount float64 `json:"margin_amount"`
			Total        float64 `json:"total"`
			Advance      float64 `json:"advance"`
		} `json:"totals"`
	}](t, detailRec)
	if detail.Totals.MaterialCost != 2400 || detail.Totals.WasteCost != 240 || detail.Totals.LaborCost != 800 {
		t.Fatalf("unexpected totals: %+v", detail.Totals)
	}
	if detail.Totals.Total != 4644 || detail.Totals.Advance != 2322 {
		t.Fatalf("unexpected quote totals: %+v", detail.Totals)
	}

	quoteRec := ts.do(t, http.MethodPost, "/api/projects/"+project.ID+"/quote", map[string]any{"notes": "Vigencia 15 dias"})
	if quoteRec.Code != http.StatusCreated {
		t.Fatalf("create quote: %d %s", quoteRec.Code, quoteRec.Body.String())
	}
	quote := decodeJSON[struct {
		ID       string  `json:"id"`
		Total    float64 `json:"total"`
		Advance  float64 `json:"advance"`
		Snapshot any     `json:"snapshot"`
	}](t, quoteRec)
	if quote.Total != 4644 || quote.Advance != 2322 || quote.Snapshot == nil {
		t.Fatalf("unexpected quote: %+v", quote)
	}

	pdfRec := ts.do(t, http.MethodGet, "/api/quotes/"+quote.ID+"/pdf", nil)
	if pdfRec.Code != http.StatusOK {
		t.Fatalf("quote pdf: %d %s", pdfRec.Code, pdfRec.Body.String())
	}
	if got := pdfRec.Header().Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("content-type = %s, want application/pdf", got)
	}
}
