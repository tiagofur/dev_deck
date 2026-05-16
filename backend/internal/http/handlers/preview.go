package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/domain/items"
	"devdeck/internal/enricher"
)

// PreviewHandler handles POST /api/items/preview. Returns metadata for a
// URL without persisting anything — used for instant preview while
// the user types.
type PreviewHandler struct {
	enricher *enricher.Service
}

type PreviewInput struct {
	URL      string `json:"url"`
	TypeHint string `json:"type_hint,omitempty"`
}

type PreviewResponse struct {
	URL         string  `json:"url,omitempty"`
	Title       string  `json:"title,omitempty"`
	Description string  `json:"description,omitempty"`
	Image       string  `json:"image,omitempty"`
	Type        string  `json:"type"`
}

func NewPreviewHandler(en *enricher.Service) *PreviewHandler {
	return &PreviewHandler{enricher: en}
}

// Preview handles POST /api/items/preview.
func (h *PreviewHandler) Preview(w http.ResponseWriter, r *http.Request) {
	var in PreviewInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.URL == "" {
		writeError(w, http.StatusBadRequest, "MISSING_URL", "url is required")
		return
	}

	// Detect type from URL (the same logic capture uses)
	det := items.DetectType(items.CaptureInput{
		URL:      in.URL,
		TypeHint: in.TypeHint,
	})

	resp := PreviewResponse{
		URL:   in.URL,
		Type:  string(det.Type),
		Title: det.Title,
	}

	// Try to fetch OG metadata for title/description/image
	// This is best-effort — failure to fetch shouldn't block preview
	if md, err := h.enricher.Enrich(r.Context(), in.URL, nil); err == nil && md != nil {
		if md.Description != nil && *md.Description != "" {
			resp.Description = *md.Description
		}
		if md.OGImageURL != nil && *md.OGImageURL != "" {
			resp.Image = *md.OGImageURL
		}
		// If we got OG title, prefer it over detected title
		if resp.Title == "" && md.Description != nil {
			resp.Title = *md.Description
		}
	}

	writeJSON(w, http.StatusOK, resp)
}