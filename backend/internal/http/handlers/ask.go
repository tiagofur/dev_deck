package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"devdeck/internal/ai"
	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// AskHandler handles RAG-based questions about the user's vault.
type AskHandler struct {
	store      *store.Store
	embeddings *ai.EmbeddingsService
}

func NewAskHandler(s *store.Store, emb *ai.EmbeddingsService) *AskHandler {
	return &AskHandler{store: s, embeddings: emb}
}

type AskRequest struct {
	Question string `json:"question"`
}

type AskResponse struct {
	Answer  string                    `json:"answer"`
	Sources []store.SearchItemsResult `json:"sources,omitempty"`
}

// POST /api/ask
// Body: {"question": "..."}
// Returns: {"answer": "...", "sources": [...]}
func (h *AskHandler) Ask(w http.ResponseWriter, r *http.Request) {
	var req AskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.Question == "" {
		writeError(w, http.StatusBadRequest, "MISSING_QUESTION", "question is required")
		return
	}

	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	// Generate embedding for the question
	var embedding []float32
	if h.embeddings != nil && h.embeddings.Enabled() {
		emb, err := h.embeddings.EmbedSearch(r.Context(), req.Question)
		if err != nil {
			// Log but continue with text search
			emb = nil
		} else {
			embedding = emb
		}
	}

	result, err := h.store.AskDevDeck(r.Context(), userID, req.Question, embedding, 5)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, AskResponse{
		Answer:  result.Answer,
		Sources: result.Sources,
	})
}

// ItemRelatedHandler handles GET /api/items/:id/related
type ItemRelatedHandler struct {
	store *store.Store
}

func NewItemRelatedHandler(s *store.Store) *ItemRelatedHandler {
	return &ItemRelatedHandler{store: s}
}

// GET /api/items/:id/related?limit=...
func (h *ItemRelatedHandler) Related(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	limit := 5
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 20 {
			limit = n
		}
	}

	// GetItem already checks ownership via context
	_, err = h.store.GetItem(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "item not found")
		return
	}

	results, err := h.store.GetRelatedItems(r.Context(), id, limit)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"item_id": id,
		"related": results,
	})
}