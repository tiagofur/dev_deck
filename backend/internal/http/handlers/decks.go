package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"devdeck/internal/authctx"
	"devdeck/internal/cache"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Profile represents a public user profile.
type Profile struct {
	ID              uuid.UUID `json:"id"`
	Username        string    `json:"username"`
	Bio             string    `json:"bio,omitempty"`
	AvatarURL       string    `json:"avatar_url,omitempty"`
	PublicDeckCount int       `json:"public_deck_count"`
	TotalItems      int       `json:"total_items"`
	CreatedAt       string    `json:"created_at"`
}

// ProfileHandler handles public profile operations.
type ProfileHandler struct {
	store *store.Store
	cache *cache.Cache
}

func NewProfileHandler(s *store.Store, c *cache.Cache) *ProfileHandler {
	return &ProfileHandler{store: s, cache: c}
}

// GET /api/users/:username/public — public profile (no auth)
func (h *ProfileHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		writeError(w, http.StatusBadRequest, "MISSING_USERNAME", "username is required")
		return
	}

	cacheKey := fmt.Sprintf("profile:%s", username)
	var profile map[string]any
	found, _ := h.cache.Get(r.Context(), cacheKey, &profile)
	if !found {
		p, err := h.store.GetPublicProfile(r.Context(), username)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
				return
			}
			writeInternal(w, err)
			return
		}
		profile = p
		_ = h.cache.Set(r.Context(), cacheKey, profile, 5*time.Minute)
	}

	// Optional: check if following (always dynamic)
	isFollowing := false
	if currentID, ok := authctx.UserID(r.Context()); ok {
		profileIDStr, _ := profile["id"].(string)
		profileID, _ := uuid.Parse(profileIDStr)
		if currentID != profileID {
			if followed, err := h.store.IsFollowing(r.Context(), currentID, profileID); err == nil {
				isFollowing = followed
			}
		}
	}
	profile["is_following"] = isFollowing

	writeJSON(w, http.StatusOK, map[string]any{
		"profile": profile,
	})
}

// GET /api/users/:username/public/decks — user's public decks (no auth)
func (h *ProfileHandler) GetPublicDecks(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		writeError(w, http.StatusBadRequest, "MISSING_USERNAME", "username is required")
		return
	}

	// 1. Get user ID first
	profile, err := h.store.GetPublicProfile(r.Context(), username)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			return
		}
		writeInternal(w, err)
		return
	}

	userID := profile["id"].(uuid.UUID)

	// 2. Query public decks (this method might need to be implemented/exported)
	// For now, we'll implement a query here or add to store.
	rows, err := h.store.Pool().Query(r.Context(), `
		SELECT id, slug, title, description, is_public, created_at, updated_at
		FROM decks
		WHERE user_id = $1 AND is_public = true
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		writeInternal(w, err)
		return
	}
	defer rows.Close()

	decks := []Deck{}
	for rows.Next() {
		var d Deck
		var desc *string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&d.ID, &d.Slug, &d.Title, &desc, &d.IsPublic, &createdAt, &updatedAt); err != nil {
			writeInternal(w, err)
			return
		}
		d.Description = desc
		d.CreatedAt = createdAt.Format(time.RFC3339)
		d.UpdatedAt = updatedAt.Format(time.RFC3339)
		decks = append(decks, d)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"decks": decks,
	})
}

// Deck represents a shared deck.
type Deck struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	IsPublic    bool      `json:"is_public"`
	ItemCount   int       `json:"item_count,omitempty"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// DeckItem represents an item in a deck.
type DeckItem struct {
	ItemID   uuid.UUID `json:"item_id"`
	Position int       `json:"position"`
}

// DeckCreateRequest is the request to create a deck.
type DeckCreateRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	IsPublic    bool    `json:"is_public"`
}

// DeckUpdateRequest is the request to update a deck.
type DeckUpdateRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	IsPublic    *bool   `json:"is_public,omitempty"`
}

// AddItemsRequest is the request to add items to a deck.
type AddItemsRequest struct {
	ItemIDs []uuid.UUID `json:"item_ids"`
}

// DeckHandler handles deck CRUD operations.
type DeckHandler struct {
	store *store.Store
}

func NewDeckHandler(s *store.Store) *DeckHandler {
	return &DeckHandler{store: s}
}

// GET /api/decks — list user's decks
func (h *DeckHandler) List(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	decks, err := h.store.ListDecks(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"decks": decks,
	})
}

// POST /api/decks — create a new deck
func (h *DeckHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req DeckCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "INVALID_TITLE", "title is required")
		return
	}

	d, err := h.store.CreateDeck(r.Context(), userID, store.CreateDeckInput{
		Title:       req.Title,
		Description: req.Description,
		IsPublic:    req.IsPublic,
	})
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"deck": d,
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

	deck, err := h.store.GetDeck(r.Context(), id)
	if errors.Is(err, store.ErrDeckNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "deck not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

	itemIDs, _ := h.store.GetDeckItems(r.Context(), id)

	writeJSON(w, http.StatusOK, map[string]any{
		"deck":  deck,
		"items": itemIDs,
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	d, err := h.store.UpdateDeck(r.Context(), id, store.UpdateDeckInput{
		Title:       req.Title,
		Description: req.Description,
		IsPublic:    req.IsPublic,
	})
	if errors.Is(err, store.ErrDeckNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "deck not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"deck": d,
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

	err = h.store.DeleteDeck(r.Context(), id)
	if errors.Is(err, store.ErrDeckNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "deck not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "INVALID_ITEMS", "item_ids required")
		return
	}

	err = h.store.AddItemsToDeck(r.Context(), id, req.ItemIDs)
	if errors.Is(err, store.ErrDeckNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "deck not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"added": len(req.ItemIDs),
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

	err = h.store.RemoveItemFromDeck(r.Context(), deckID, itemID)
	if errors.Is(err, store.ErrDeckItemNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "item not in deck")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"removed": true,
	})
}

// ───── Public Deck (no auth) ─────

// PublicDeckHandler handles public deck operations.
type PublicDeckHandler struct {
	store *store.Store
}

func NewPublicDeckHandler(s *store.Store) *PublicDeckHandler {
	return &PublicDeckHandler{store: s}
}

// GET /api/decks/:slug/public — get public deck (no auth)
func (h *PublicDeckHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SLUG", "slug is required")
		return
	}

	deck, err := h.store.GetPublicDeckBySlug(r.Context(), slug)
	if errors.Is(err, store.ErrDeckNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "public deck not found")
		return
	}
	if err != nil {
		writeInternal(w, err)
		return
	}

	items, err := h.store.GetPublicDeckItems(r.Context(), deck.ID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"deck":  deck,
		"items": items,
	})
}

// ───── Import ─────

// ImportHandler handles importing decks.
type ImportHandler struct {
	store *store.Store
}

func NewImportHandler(s *store.Store) *ImportHandler {
	return &ImportHandler{store: s}
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

	count, err := h.store.ImportDeckItems(r.Context(), userID, id)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"imported": count,
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
type AdminHandler struct {
	store *store.Store
}

func NewAdminHandler(s *store.Store) *AdminHandler {
	return &AdminHandler{store: s}
}

// GET /api/admin/users — list all users (admin only)
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.store.ListUsersAdmin(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"users": users,
	})
}

// UserInfo is user info for admin.
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email,omitempty"`
	Plan      string    `json:"plan"`
	ItemCount int       `json:"item_count"`
	CreatedAt string    `json:"created_at"`
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
