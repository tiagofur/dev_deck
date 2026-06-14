package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// maxListLimit caps user-supplied pagination "limit" values so a single
// request can't ask for an unbounded number of rows (memory-exhaustion DoS).
const maxListLimit = 500

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
	// Log the real error server-side; never leak internal/DB error text
	// (constraint names, query fragments) to the client.
	slog.Error("internal error", "err", err)
	writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
