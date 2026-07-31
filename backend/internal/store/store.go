package store

import (
	"context"
	"errors"
	"fmt"

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

func (s *Store) Ping(ctx context.Context) error {
	return s.primary.Ping(ctx)
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

// sqlBuilder is a simple helper to build dynamic SQL queries with positional
// placeholders. It prevents manual indexing errors and ensures all dynamic
// values are passed as parameters.
type sqlBuilder struct {
	args []any
}

func (b *sqlBuilder) nextPlaceholder() string {
	return fmt.Sprintf("$%d", len(b.args)+1)
}

func (b *sqlBuilder) arg(v any) string {
	p := b.nextPlaceholder()
	b.args = append(b.args, v)
	return p
}

func (b *sqlBuilder) addAll(args ...any) {
	b.args = append(b.args, args...)
}
