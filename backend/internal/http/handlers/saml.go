package handlers

import (
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"devdeck/internal/authservice"
	"devdeck/internal/store"

	"github.com/crewjam/saml"
	"github.com/google/uuid"
)

type SAMLHandler struct {
	store       *store.Store
	authService *authservice.Service
	config      SAMLHandlerConfig
}

type SAMLHandlerConfig struct {
	EntityID    string // DevDeck SP Entity ID
	BaseURL     string // ej: https://api.devdeck.ai
	FrontendURL string // ej: https://app.devdeck.ai
}

func NewSAMLHandler(s *store.Store, as *authservice.Service, cfg SAMLHandlerConfig) *SAMLHandler {
	return &SAMLHandler{store: s, authService: as, config: cfg}
}

// POST /api/auth/login-step1
// Email Homeing: checks if the domain has SAML enabled.
func (h *SAMLHandler) LoginStep1(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	parts := strings.Split(body.Email, "@")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "INVALID_EMAIL", "invalid email address")
		return
	}
	domain := parts[1]

	cfg, err := h.store.GetSAMLConfigByDomain(r.Context(), domain)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{"type": "password"})
			return
		}
		writeInternal(w, err)
		return
	}

	// Redirect URL to initiate SAML login for this Org
	loginURL := fmt.Sprintf("%s/api/auth/saml/login?org_id=%s", h.config.BaseURL, cfg.OrgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"type":      "saml",
		"login_url": loginURL,
	})
}

// GET /api/auth/saml/metadata
func (h *SAMLHandler) Metadata(w http.ResponseWriter, r *http.Request) {
	sp := h.makeSP(nil) // Generic metadata
	buf, _ := xml.Marshal(sp.Metadata())
	w.Header().Set("Content-Type", "application/samlmetadata+xml")
	_, _ = w.Write(buf)
}

// GET /api/auth/saml/login
func (h *SAMLHandler) Login(w http.ResponseWriter, r *http.Request) {
	_, err := uuid.Parse(r.URL.Query().Get("org_id"))
	if err != nil {
		http.Error(w, "invalid org_id", http.StatusBadRequest)
		return
	}

	// In a real scenario, we would fetch the specific IDP metadata for this Org
	// and initiate the request.
	// For this phase, we'll assume a simplified flow where we redirect to the IdP SSO URL.
	writeError(w, http.StatusNotImplemented, "NOT_IMPLEMENTED", "SAML full flow is under construction")
}

// POST /api/auth/saml/acs
func (h *SAMLHandler) ACS(w http.ResponseWriter, r *http.Request) {
	// 1. Parse SAML Response
	// 2. Validate signature
	// 3. Extract Email (NameID)
	// 4. Upsert User (JIT Provisioning)
	// 5. Generate tokens and redirect to Frontend
	writeError(w, http.StatusNotImplemented, "NOT_IMPLEMENTED", "ACS is under construction")
}

func (h *SAMLHandler) makeSP(idpMetadata *saml.EntityDescriptor) *saml.ServiceProvider {
	return &saml.ServiceProvider{
		EntityID:    h.config.EntityID,
		AcsURL:      h.makeURL("/api/auth/saml/acs"),
		MetadataURL: h.makeURL("/api/auth/saml/metadata"),
		IDPMetadata: idpMetadata,
	}
}

func (h *SAMLHandler) makeURL(path string) url.URL {
	u, _ := url.Parse(h.config.BaseURL + path)
	return *u
}
