package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WebhookService interface {
	Dispatch(ctx context.Context, orgID, userID uuid.UUID, action, entityType string, entityID uuid.UUID, metadata map[string]any)
}

// Store is the data access layer wrapping a pgx connection pool.
// Methods live in the per-entity files (repos.go, etc.).
type Store struct {
	pool     *pgxpool.Pool
	webhooks WebhookService
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) SetWebhookService(svc WebhookService) {
	s.webhooks = svc
}

func (s *Store) Pool() *pgxpool.Pool {
	return s.pool
}

// Sentinel errors used by handlers to map to HTTP status codes.
var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
