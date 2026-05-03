package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type errBody struct {
	Error errPayload `json:"error"`
}

type errPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode response", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, errBody{Error: errPayload{Code: code, Message: msg}})
}

func writeInternal(w http.ResponseWriter, err error) {
	slog.Error("internal error", "err", err)
	// Include actual error for debugging
	writeJSON(w, http.StatusInternalServerError, map[string]any{
		"error": map[string]string{
			"code":    "INTERNAL",
			"message": "internal server error",
			"detail":  err.Error(),
		},
	})
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
