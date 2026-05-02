package ai

import (
	"strings"

	"devdeck/internal/domain/items"
)

// SanitizeForAI keeps only public/useful context before sending data to an
// external provider. Private free-form fields must never leave the server
// unless product policy changes explicitly.
func SanitizeForAI(item *items.Item) Input {
	if item == nil {
		return Input{}
	}
	return Input{
		Type:        item.Type,
		Title:       truncateRunes(strings.TrimSpace(item.Title), 200),
		Description: truncateRunes(strings.TrimSpace(deref(item.Description)), 500),
		URL:         item.URL,
		Meta:        sanitizeMeta(item.Meta),
	}
}

func sanitizeMeta(meta map[string]any) map[string]any {
	if len(meta) == 0 {
		return map[string]any{}
	}
	allowed := map[string]bool{
		"language":       true,
		"language_color": true,
		"topics":         true,
		"stars":          true,
		"forks":          true,
		"homepage":       true,
	}
	out := map[string]any{}
	for k, v := range meta {
		if allowed[k] {
			out[k] = v
		}
	}
	return out
}

func truncateRunes(s string, n int) string {
	if n <= 0 || s == "" {
		return ""
	}
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}
