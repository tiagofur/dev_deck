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
	primary   *pgxpool.Pool
	replica   *pgxpool.Pool
	webhooks  WebhookService
	appRegion string
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{
		primary:   pool,
		replica:   pool, // default to primary
		appRegion: "us-east",
	}
}

func NewWithReplica(primary, replica *pgxpool.Pool) *Store {
	return &Store{
		primary:   primary,
		replica:   replica,
		appRegion: "us-east",
	}
}

func (s *Store) SetAppRegion(region string) {
	s.appRegion = region
}

func (s *Store) SetWebhookService(svc WebhookService) {
	s.webhooks = svc
}

// Writer returns the primary pool for write operations.
func (s *Store) Writer() *pgxpool.Pool {
	return s.primary
}

// Reader returns the replica pool for read operations.
func (s *Store) Reader() *pgxpool.Pool {
	return s.replica
}

func (s *Store) Pool() *pgxpool.Pool {
	return s.primary
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
