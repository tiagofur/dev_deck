package handlers

import (
	"net/http"
)

type PluginTemplate struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"` // "enricher" or "webhook"
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Author      string   `json:"author"`
	IconURL     string   `json:"icon_url"`
	// For Enrichers
	URLPattern  *string  `json:"url_pattern,omitempty"`
	EndpointURL *string  `json:"endpoint_url,omitempty"`
	// For Webhooks
	Events      []string `json:"events,omitempty"`
}

var featuredPlugins = []PluginTemplate{
	{
		ID:          "npm-enricher",
		Type:        "enricher",
		Name:        "NPM Registry",
		Description: "Extrae metadata avanzada de paquetes de NPM (vía registry.npmjs.org).",
		Author:      "DevDeck Team",
		IconURL:     "https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.svg",
		URLPattern:  ptr("^https://www\\.npmjs\\.com/package/([^/]+)"),
		EndpointURL: ptr("https://plugins.devdeck.app/api/enrich/npm"),
	},
	{
		ID:          "youtube-metadata",
		Type:        "enricher",
		Name:        "YouTube AI",
		Description: "Analiza videos de YouTube y genera un resumen automático basado en la transcripción.",
		Author:      "DevDeck Community",
		IconURL:     "https://www.youtube.com/s/desktop/28b891ad/img/favicon_144x144.png",
		URLPattern:  ptr("^https://(www\\.)?youtube\\.com/watch\\?v="),
		EndpointURL: ptr("https://plugins.devdeck.app/api/enrich/youtube"),
	},
	{
		ID:          "slack-webhook",
		Type:        "webhook",
		Name:        "Slack Bridge",
		Description: "Envía una notificación a un canal de Slack cada vez que capturás un nuevo item.",
		Author:      "DevDeck Team",
		IconURL:     "https://a.slack-edge.com/80588/img/services/api_200.png",
		Events:      []string{"item.created"},
	},
}

type PluginsHandler struct{}

func NewPluginsHandler() *PluginsHandler {
	return &PluginsHandler{}
}

func (h *PluginsHandler) ListFeatured(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"plugins": featuredPlugins,
	})
}

func ptr[T any](v T) *T {
	return &v
}
