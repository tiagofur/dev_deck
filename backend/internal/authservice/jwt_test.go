package authservice

import (
	"strings"
	"testing"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
)

func TestService_GenerateAndValidateAccessToken(t *testing.T) {
	svc := New("super-secret", 1*time.Hour, 24*time.Hour)
	user := auth.User{
		ID:    uuid.New(),
		Login: "ada",
		Role:  "admin",
	}

	token, ttl, err := svc.GenerateAccessToken(user)
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
	if ttl != int64((1 * time.Hour).Seconds()) {
		t.Errorf("unexpected ttl: %d", ttl)
	}
	if !strings.HasPrefix(token, "eyJ") {
		t.Errorf("token does not look like a JWT: %q", token)
	}

	gotID, gotRole, err := svc.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if gotID != user.ID {
		t.Errorf("expected user id %s, got %s", user.ID, gotID)
	}
	if gotRole != user.Role {
		t.Errorf("expected role %s, got %s", user.Role, gotRole)
	}
}

func TestService_ValidateAccessToken_RejectsTamperedToken(t *testing.T) {
	svc := New("secret", 1*time.Hour, 24*time.Hour)
	user := auth.User{ID: uuid.New(), Login: "x", Role: "user"}
	token, _, _ := svc.GenerateAccessToken(user)

	// Flip a character in the signature.
	tampered := token[:len(token)-2] + "AA"
	if _, _, err := svc.ValidateAccessToken(tampered); err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken on tampered jwt, got %v", err)
	}
}

func TestService_ValidateAccessToken_RejectsExpired(t *testing.T) {
	svc := New("secret", -1*time.Second, 24*time.Hour) // already expired
	token, _, _ := svc.GenerateAccessToken(auth.User{ID: uuid.New(), Login: "x", Role: "user"})
	if _, _, err := svc.ValidateAccessToken(token); err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken on expired jwt, got %v", err)
	}
}

func TestService_ValidateAccessToken_RejectsWrongSecret(t *testing.T) {
	a := New("secret-A", 1*time.Hour, 24*time.Hour)
	b := New("secret-B", 1*time.Hour, 24*time.Hour)

	token, _, _ := a.GenerateAccessToken(auth.User{ID: uuid.New(), Login: "x", Role: "user"})
	if _, _, err := b.ValidateAccessToken(token); err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken when verifying with wrong secret, got %v", err)
	}
}

func TestService_RefreshTokenRoundtrip(t *testing.T) {
	svc := New("secret", 1*time.Hour, 24*time.Hour)

	raw, hashed, err := svc.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("generate refresh: %v", err)
	}
	if raw == "" || hashed == "" {
		t.Fatal("expected non-empty raw and hashed tokens")
	}
	if raw == hashed {
		t.Fatal("hash should differ from raw")
	}
	// HashRefreshToken on the raw must match.
	if svc.HashRefreshToken(raw) != hashed {
		t.Errorf("HashRefreshToken should be deterministic")
	}
}

func TestService_RefreshExpiry(t *testing.T) {
	svc := New("secret", 1*time.Hour, 30*time.Minute)
	exp := svc.RefreshExpiry()
	delta := time.Until(exp)
	if delta < 29*time.Minute || delta > 31*time.Minute {
		t.Errorf("expected ~30m, got %v", delta)
	}
}
