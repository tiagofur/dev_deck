package authservice

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
)

// Service handles JWT generation/validation and refresh token hashing.
type Service struct {
	accessSecret []byte
	accessTTL    time.Duration
	refreshTTL   time.Duration
}

func New(secret string, accessTTL, refreshTTL time.Duration) *Service {
	return &Service{
		accessSecret: []byte(secret),
		accessTTL:    accessTTL,
		refreshTTL:   refreshTTL,
	}
}

// GenerateAccessToken creates a signed JWT with the user's ID and login.
func (s *Service) GenerateAccessToken(user auth.User) (string, int64, error) {
	expiresAt := time.Now().Add(s.accessTTL)
	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"login": user.Login,
		"role":  user.Role,
		"plan":  user.Plan,
		"exp":   expiresAt.Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.accessSecret)
	if err != nil {
		return "", 0, fmt.Errorf("sign access token: %w", err)
	}
	return signed, int64(s.accessTTL.Seconds()), nil
}

// ValidateAccessToken parses and validates a JWT, returning the user ID, role, and plan.
func (s *Service) ValidateAccessToken(tokenStr string) (uuid.UUID, string, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.accessSecret, nil
	})
	if err != nil {
		return uuid.Nil, "", "", ErrInvalidToken
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return uuid.Nil, "", "", ErrInvalidToken
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		return uuid.Nil, "", "", ErrInvalidToken
	}
	role, _ := claims["role"].(string)
	plan, _ := claims["plan"].(string)
	if plan == "" {
		plan = "free"
	}
	id, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, "", "", ErrInvalidToken
	}
	return id, role, plan, nil
}

// GenerateRefreshToken creates a random refresh token and returns
// both the raw token (to send to client) and its hash (to store in DB).
func (s *Service) GenerateRefreshToken() (raw string, hashed string, err error) {
	raw = uuid.New().String()
	h := sha256.Sum256([]byte(raw))
	hashed = hex.EncodeToString(h[:])
	return raw, hashed, nil
}

// HashRefreshToken hashes a raw refresh token for comparison.
func (s *Service) HashRefreshToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// RefreshExpiry returns the expiry time for a new refresh token.
func (s *Service) RefreshExpiry() time.Time {
	return time.Now().Add(s.refreshTTL)
}
