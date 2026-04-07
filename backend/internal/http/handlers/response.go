package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"
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
		log.Error().Err(err).Msg("encode response")
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, errBody{Error: errPayload{Code: code, Message: msg}})
}

func writeInternal(w http.ResponseWriter, err error) {
	log.Error().Err(err).Msg("internal error")
	writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
}
