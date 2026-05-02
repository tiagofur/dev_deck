package handlers

import (

	"encoding/json"
	"errors"
	"net/http"

	"devdeck/internal/enricher"
	"devdeck/internal/metrics"
	)

type MetadataHandler struct {

	    enricher *enricher.Service
}

func NewMetadataHandler(en *enricher.Service) *MetadataHandler {
	    return &MetadataHandler{enricher: en}
}

// MetadataRequest is the query for fetching metadata.
type MetadataRequest struct {
	    URL string `json:"url"`
}

// MetadataResponse returns extracted metadata from a URL.
type MetadataResponse struct {
	    Description string   `json:"description"`
	    ImageURL    string   `json:"image_url"`
	    Topics      []string `json:"topics"`
}

// Extract handles POST /api/v1/metadata.
// Extracts og:title, og:description, og:image from the given URL.
func (h *MetadataHandler) Extract(w http.ResponseWriter, r *http.Request) {
	    var in MetadataRequest
	    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			        writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
			        return
			    }

	    if in.URL == "" {
			        writeError(w, http.StatusUnprocessableEntity, "MISSING_URL", "url is required")
			        return
			    }

	    // Fetch metadata using the enricher
	    md, err := h.enricher.Enrich(r.Context(), in.URL)
	    if err != nil {
			        metrics.MetadataExtractions.WithLabelValues("error").Inc()

			        status := http.StatusBadGateway
			        code := "FETCH_FAILED"

			        switch {
						        case errors.Is(err, enricher.ErrInvalidURL):
						            status = http.StatusBadRequest
						            code = "INVALID_URL"
						        case errors.Is(err, enricher.ErrNotFound):
						            status = http.StatusNotFound
						            code = "NOT_FOUND"
						        }

			        writeError(w, status, code, err.Error())
			        return
			    }

	    metrics.MetadataExtractions.WithLabelValues("success").Inc()

	    resp := MetadataResponse{
			        Topics: md.Topics,
			    }

	    if md.Description != nil {
			        resp.Description = *md.Description
			    }
	    if md.OGImageURL != nil {
			        resp.ImageURL = *md.OGImageURL
			    }

	    w.Header().Set("Content-Type", "application/json")
	    json.NewEncoder(w).Encode(resp)
}
