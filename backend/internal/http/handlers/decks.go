package handlers

import (
	"net/http"
	"strconv"

	"devdeck/internal/authctx"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Profile represents a public user profile.
type Profile struct {
	ID              uuid.UUID `json:"id"`
	Username        string   `json:"username"`
	Bio             string   `json:"bio,omitempty"`
	AvatarURL       string   `json:"avatar_url,omitempty"`
	PublicDeckCount int      `json:"public_deck_count"`
	TotalItems     int      `json:"total_items"`
	CreatedAt      string   `json:"created_at"`
}

// ProfileHandler handles public profile operations.
type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

// GET /api/users/:username/public — public profile (no auth)
func (h *ProfileHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		writeError(w, http.StatusBadRequest, "MISSING_USERNAME", "username is required")
		return
	}

	// TODO: Query profile from DB using get_user_by_username()
	writeJSON(w, http.StatusOK, map[string]any{
		"profile": Profile{},
	})
}

// GET /api/users/:username/public/decks — user's public decks (no auth)
func (h *ProfileHandler) GetPublicDecks(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		writeError(w, http.StatusBadRequest, "MISSING_USERNAME", "username is required")
		return
	}

	// TODO: Query public decks from DB
	writeJSON(w, http.StatusOK, map[string]any{
		"decks": []Deck{},
	})
}

// Deck represents a shared deck.
type Deck struct {
	ID          uuid.UUID `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	IsPublic    bool     `json:"is_public"`
	ItemCount   int      `json:"item_count,omitempty"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
}

// DeckItem represents an item in a deck.
type DeckItem struct {
	ItemID   uuid.UUID `json:"item_id"`
	Position int      `json:"position"`
}

// DeckCreateRequest is the request to create a deck.
type DeckCreateRequest struct {
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	IsPublic    bool   `json:"is_public"`
}

// DeckUpdateRequest is the request to update a deck.
type DeckUpdateRequest struct {
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	IsPublic    *bool  `json:"is_public,omitempty"`
}

// AddItemsRequest is the request to add items to a deck.
type AddItemsRequest struct {
	ItemIDs []uuid.UUID `json:"item_ids"`
}

// DeckHandler handles deck CRUD operations.
type DeckHandler struct{}

func NewDeckHandler() *DeckHandler {
	return &DeckHandler{}
}

// GET /api/decks — list user's decks
func (h *DeckHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	_ = userID // TODO: Query from DB
	writeJSON(w, http.StatusOK, map[string]any{
		"decks": []Deck{},
	})
}

// POST /api/decks — create a new deck
func (h *DeckHandler) Create(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req DeckCreateRequest
	_ = req // TODO: Parse and create

	writeJSON(w, http.StatusOK, map[string]any{
		"deck": Deck{},
	})
}

// GET /api/decks/:id — get deck detail
func (h *DeckHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	_ = id // TODO: Query from DB
	writeJSON(w, http.StatusOK, map[string]any{
		"deck": Deck{},
		"items": []DeckItem{},
	})
}

// PATCH /api/decks/:id — update deck
func (h *DeckHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	var req DeckUpdateRequest
	_ = req // TODO: Parse and update

	_ = id
	writeJSON(w, http.StatusOK, map[string]any{
		"deck": Deck{},
	})
}

// DELETE /api/decks/:id — delete deck
func (h *DeckHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	_ = id // TODO: Delete from DB
	writeJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}

// POST /api/decks/:id/items — add items to deck
func (h *DeckHandler) AddItems(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	var req AddItemsRequest
	_ = req // TODO: Parse and add items

	_ = id
	writeJSON(w, http.StatusOK, map[string]any{
		"added": 0,
	})
}

// DELETE /api/decks/:id/items/:itemId — remove item from deck
func (h *DeckHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	deckID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "deck id must be a uuid")
		return
	}

	itemID, err := uuid.Parse(chi.URLParam(r, "itemId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM", "item id must be a uuid")
		return
	}

	_ = deckID
	_ = itemID // TODO: Remove from DB

	writeJSON(w, http.StatusOK, map[string]any{
		"removed": true,
	})
}

// ───── Public Deck (no auth) ─────

// PublicDeckHandler handles public deck operations.
type PublicDeckHandler struct{}

func NewPublicDeckHandler() *PublicDeckHandler {
	return &PublicDeckHandler{}
}

// GET /api/decks/:slug/public — get public deck (no auth)
func (h *PublicDeckHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SLUG", "slug is required")
		return
	}

	// TODO: Query public deck from DB
	writeJSON(w, http.StatusOK, map[string]any{
		"deck": Deck{},
		"items": []DeckItem{},
	})
}

// ───── Import ─────

// ImportHandler handles importing decks.
type ImportHandler struct{}

func NewImportHandler() *ImportHandler {
	return &ImportHandler{}
}

// POST /api/decks/:id/import — import deck to user's vault
func (h *ImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	_ = userID
	_ = id // TODO: Import items to user's vault

	writeJSON(w, http.StatusOK, map[string]any{
		"imported": 0,
	})
}

// POST /api/decks/:id/star — star a deck
func (h *ImportHandler) Star(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	_ = id // TODO: Star in DB
	writeJSON(w, http.StatusOK, map[string]any{
		"starred": true,
	})
}

// DELETE /api/decks/:id/star — unstar a deck
func (h *ImportHandler) Unstar(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	_ = id // TODO: Unstar in DB
	writeJSON(w, http.StatusOK, map[string]any{
		"unstarred": true,
	})
}

// ───── Admin Users ─────

// AdminHandler handles admin user management.
type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

// GET /api/admin/users — list all users (admin only)
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// TODO: Check admin role/permission
	writeJSON(w, http.StatusOK, map[string]any{
		"users": []UserInfo{},
	})
}

// UserInfo is user info for admin.
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Username  string `json:"username"`
	Email    string `json:"email,omitempty"`
	Plan     string `json:"plan"`
	ItemCount int  `json:"item_count"`
	CreatedAt string `json:"created_at"`
}

// Helper to parse limit query param.
func parseLimitFromQuery(q string, def, max int) int {
	if q == "" {
		return def
	}
	n, err := strconv.Atoi(q)
	if err != nil || n <= 0 || n > max {
		return def
	}
	return n
}