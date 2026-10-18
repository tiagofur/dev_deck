package handlers

import (
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"heapdeck/internal/authservice"
	"heapdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type RealtimeHandler struct {
	rooms       map[string]*Room
	mu          sync.Mutex
	upgrader    websocket.Upgrader
	authService *authservice.Service
	store       *store.Store
}

// NewRealtimeHandler builds the collaborative-rooms handler. Realtime rooms
// relay Yjs document updates between clients, so they must never be open:
// connections authenticate with an access token and may only join rooms for
// items they can read. allowedOrigins is the CORS allowlist — browsers always
// send Origin on WebSocket handshakes, so cross-site pages are rejected while
// non-browser clients (no Origin header) keep working.
func NewRealtimeHandler(as *authservice.Service, st *store.Store, allowedOrigins []string) *RealtimeHandler {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	return &RealtimeHandler{
		rooms:       make(map[string]*Room),
		authService: as,
		store:       st,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				return allowed[strings.TrimRight(origin, "/")]
			},
		},
	}
}

// Room represents a real-time collaboration room (e.g. for an item or deck)
type Room struct {
	id      string
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

func (r *Room) broadcast(msgType int, data []byte, sender *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for client := range r.clients {
		if client == sender {
			continue
		}
		if err := client.WriteMessage(msgType, data); err != nil {
			slog.Error("failed to broadcast message", "room", r.id, "err", err)
			_ = client.Close()
			delete(r.clients, client)
		}
	}
}

// WS /api/realtime/{roomID}
//
// Rooms are named "item-<uuid>" and access follows item visibility: owner or
// organization member. The access token travels in the query string because
// the WebSocket API cannot send headers.
func (h *RealtimeHandler) Connect(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomID")
	itemIDStr, ok := strings.CutPrefix(roomID, "item-")
	if !ok {
		http.Error(w, "invalid room id", http.StatusBadRequest)
		return
	}
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		http.Error(w, "invalid room id", http.StatusBadRequest)
		return
	}

	userID, _, _, err := h.authService.ValidateAccessToken(r.URL.Query().Get("token"))
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	allowed, err := h.store.CanAccessItem(r.Context(), userID, itemID)
	if err != nil || !allowed {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade to websocket", "err", err)
		return
	}
	defer func() { _ = conn.Close() }()

	h.mu.Lock()
	room, ok := h.rooms[roomID]
	if !ok {
		room = &Room{
			id:      roomID,
			clients: make(map[*websocket.Conn]bool),
		}
		h.rooms[roomID] = room
	}
	room.mu.Lock()
	room.clients[conn] = true
	room.mu.Unlock()
	h.mu.Unlock()

	slog.Info("client connected to room", "room", roomID)

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("websocket read error", "room", roomID, "err", err)
			}
			break
		}
		// Basic Yjs relay: broadcast every message to everyone else in the room
		room.broadcast(msgType, msg, conn)
	}

	h.mu.Lock()
	room.mu.Lock()
	delete(room.clients, conn)
	if len(room.clients) == 0 {
		delete(h.rooms, roomID)
	}
	room.mu.Unlock()
	h.mu.Unlock()

	slog.Info("client disconnected from room", "room", roomID)
}
