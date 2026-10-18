package handlers_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/config"
	"heapdeck/internal/email"
	"heapdeck/internal/enricher"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/jobs"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// realtimeServer is a JWT-mode server with the realtime feature enabled and
// a live HTTP listener, so tests can drive real WebSocket handshakes.
type realtimeServer struct {
	orgAuthzServer
	http *httptest.Server
}

func newRealtimeServer(t *testing.T) *realtimeServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)

	en := enricher.NewForTest("http://github-fake.invalid")
	aiSvc := ai.NewHeuristic()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	q := jobs.NewEnrichQueue(st, en, aiSvc, 32)
	q.Start(ctx)

	const secret = "realtime-test-secret"
	as := authservice.New(secret, time.Hour, time.Hour)
	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		JWTSecret:         secret,
		RateLimitDisabled: true,
		FeatureRealtime:   true,
		CORSOrigins:       "http://localhost:5173",
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    en,
		AuthService: as,
		EnrichQueue: q,
		AI:          aiSvc,
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
	})
	srv := httptest.NewServer(router)
	t.Cleanup(srv.Close)

	return &realtimeServer{
		orgAuthzServer: orgAuthzServer{router: router, store: st, auth: as},
		http:           srv,
	}
}

func (s *realtimeServer) createItem(t *testing.T, userID uuid.UUID, orgID *uuid.UUID) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := s.store.Writer().QueryRow(context.Background(),
		`INSERT INTO items (user_id, org_id, item_type, title) VALUES ($1, $2, 'note', 'realtime test') RETURNING id`,
		userID, orgID).Scan(&id)
	if err != nil {
		t.Fatalf("create item: %v", err)
	}
	return id
}

// dialStatus performs the handshake and consumes the response entirely,
// returning the HTTP status (101 on success) so callers never hold a body.
func (s *realtimeServer) dialStatus(t *testing.T, roomID, token, origin string) (int, error) {
	t.Helper()
	wsURL := "ws" + strings.TrimPrefix(s.http.URL, "http") + "/api/realtime/" + roomID
	if token != "" {
		wsURL += "?token=" + url.QueryEscape(token)
	}
	header := http.Header{}
	if origin != "" {
		header.Set("Origin", origin)
	}
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if resp != nil {
		defer func() { _ = resp.Body.Close() }()
	}
	if err != nil {
		if resp != nil {
			return resp.StatusCode, err
		}
		return 0, err
	}
	_ = conn.Close()
	return http.StatusSwitchingProtocols, nil
}

// Unauthenticated sockets, foreign rooms and cross-site origins are all
// rejected; owners and org members can join.
func TestRealtime_Connect(t *testing.T) {
	s := newRealtimeServer(t)
	ctx := context.Background()

	owner := s.user(t, "rt-owner")
	intruder := s.user(t, "rt-intruder")
	member := s.user(t, "rt-member")

	ownerTok := s.token(t, owner)
	memberTok := s.token(t, member)
	intruderTok := s.token(t, intruder)

	org, err := s.store.CreateOrganization(ctx, owner.ID, "RT Org")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}
	if err := s.store.AddOrgMember(ctx, org.ID, member.ID, "viewer"); err != nil {
		t.Fatalf("add member: %v", err)
	}

	ownItem := s.createItem(t, owner.ID, nil)
	orgItem := s.createItem(t, owner.ID, &org.ID)

	// Missing/invalid token → 401 before any upgrade.
	if status, err := s.dialStatus(t, "item-"+ownItem.String(), "", ""); err == nil {
		t.Fatal("expected dial without token to fail")
	} else if status != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d err=%v", status, err)
	}

	// Non-"item-" rooms are rejected outright.
	if status, err := s.dialStatus(t, "garbage", ownerTok, ""); err == nil {
		t.Fatal("expected dial with malformed room to fail")
	} else if status != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d err=%v", status, err)
	}

	// An item owned by someone else → 403.
	if status, err := s.dialStatus(t, "item-"+ownItem.String(), intruderTok, ""); err == nil {
		t.Fatal("expected dial to foreign item to fail")
	} else if status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d err=%v", status, err)
	}

	// Cross-site origins are rejected even with a valid token.
	if status, err := s.dialStatus(t, "item-"+ownItem.String(), ownerTok, "https://evil.example"); err == nil {
		t.Fatal("expected evil origin to fail")
	} else if status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d err=%v", status, err)
	}

	// Owner joins their own room.
	if status, err := s.dialStatus(t, "item-"+ownItem.String(), ownerTok, "http://localhost:5173"); err != nil || status != http.StatusSwitchingProtocols {
		t.Fatalf("owner dial: status=%d err=%v", status, err)
	}

	// Org members can join rooms for org items; intruders still cannot.
	if status, err := s.dialStatus(t, "item-"+orgItem.String(), memberTok, ""); err != nil || status != http.StatusSwitchingProtocols {
		t.Fatalf("member dial: status=%d err=%v", status, err)
	}

	if status, err := s.dialStatus(t, "item-"+orgItem.String(), intruderTok, ""); err == nil {
		t.Fatal("expected intruder dial to org item to fail")
	} else if status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d err=%v", status, err)
	}
}
