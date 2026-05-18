package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
)

type SAMLConfig struct {
	OrgID       uuid.UUID `json:"org_id"`
	IDPEntityID string    `json:"idp_entity_id"`
	IDPSSOURL   string    `json:"idp_sso_url"`
	IDPX509Cert string    `json:"idp_x509_cert"`
	Domain      string    `json:"domain"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (s *Store) GetSAMLConfigByDomain(ctx context.Context, domain string) (*SAMLConfig, error) {
	var c SAMLConfig
	err := s.Reader().QueryRow(ctx, `
		SELECT org_id, idp_entity_id, idp_sso_url, idp_x509_cert, domain, is_active, created_at, updated_at
		FROM saml_configs
		WHERE domain = $1 AND is_active = true
	`, domain).Scan(
		&c.OrgID, &c.IDPEntityID, &c.IDPSSOURL, &c.IDPX509Cert, &c.Domain, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Store) UpsertSAMLConfig(ctx context.Context, orgID uuid.UUID, idpEntityID, ssoURL, cert, domain string) (*SAMLConfig, error) {
	var c SAMLConfig
	err := s.Writer().QueryRow(ctx, `
		INSERT INTO saml_configs (org_id, idp_entity_id, idp_sso_url, idp_x509_cert, domain)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (org_id) DO UPDATE SET
			idp_entity_id = EXCLUDED.idp_entity_id,
			idp_sso_url = EXCLUDED.idp_sso_url,
			idp_x509_cert = EXCLUDED.idp_x509_cert,
			domain = EXCLUDED.domain,
			updated_at = NOW()
		RETURNING org_id, idp_entity_id, idp_sso_url, idp_x509_cert, domain, is_active, created_at, updated_at
	`, orgID, idpEntityID, ssoURL, cert, domain).Scan(
		&c.OrgID, &c.IDPEntityID, &c.IDPSSOURL, &c.IDPX509Cert, &c.Domain, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Store) SetUserSSOProvider(ctx context.Context, userID uuid.UUID, provider string) error {
	_, err := s.Writer().Exec(ctx, `UPDATE users SET sso_provider = $2 WHERE id = $1`, userID, provider)
	return err
}

func (s *Store) CreateSCIMToken(ctx context.Context, orgID uuid.UUID) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)
	hash := hashToken(token)

	_, err := s.Writer().Exec(ctx, `
		INSERT INTO scim_tokens (org_id, token_hash)
		VALUES ($1, $2)
		ON CONFLICT (org_id) DO UPDATE SET token_hash = EXCLUDED.token_hash
	`, orgID, hash)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *Store) ValidateSCIMToken(ctx context.Context, token string) (uuid.UUID, error) {
	hash := hashToken(token)
	var orgID uuid.UUID
	err := s.Reader().QueryRow(ctx, `
		SELECT org_id FROM scim_tokens WHERE token_hash = $1
	`, hash).Scan(&orgID)
	if err != nil {
		return uuid.Nil, err
	}
	return orgID, nil
}
