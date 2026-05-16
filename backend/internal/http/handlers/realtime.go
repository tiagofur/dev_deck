package handlers

import (
	"log/slog"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now, production should be stricter
	},
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
			client.Close()
			delete(r.clients, client)
		}
	}
}

type RealtimeHandler struct {
	rooms map[string]*Room
	mu    sync.Mutex
}

func NewRealtimeHandler() *RealtimeHandler {
	return &RealtimeHandler{
		rooms: make(map[string]*Room),
	}
}

// WS /api/realtime/{roomID}
func (h *RealtimeHandler) Connect(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomID")
	if roomID == "" {
		http.Error(w, "missing room id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade to websocket", "err", err)
		return
	}
	defer conn.Close()

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
