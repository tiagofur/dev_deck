package config

import (
	"errors"
	"strings"

	"github.com/caarlos0/env/v11"
)

// Config holds all environment-driven configuration for the API.
// Wave 1 only uses the `token` AuthMode. JWT/OAuth fields land in Wave 4.
type Config struct {
	Port        string `env:"PORT" envDefault:"8080"`
	DBURL       string `env:"DB_URL,required"`
	AuthMode    string `env:"AUTH_MODE" envDefault:"token"`
	APIToken    string `env:"API_TOKEN"`
	GithubToken string `env:"GITHUB_TOKEN"`
	LogLevel    string `env:"LOG_LEVEL" envDefault:"info"`
	CORSOrigins string `env:"CORS_ORIGINS" envDefault:"app://.,http://localhost:5173"`

	// RefreshIntervalHours: a repo whose last_fetched_at is older than this
	// gets re-enriched by the cron worker. Default 168h = 7 days.
	RefreshIntervalHours int `env:"REFRESH_INTERVAL_HOURS" envDefault:"168"`

	// SeedCheatsheets: when true, loads seed cheatsheets from seeds/cheatsheets/*.json on boot.
	SeedCheatsheets bool `env:"SEED_CHEATSHEETS" envDefault:"false"`

	// ─── Wave 4.5: Rate limiting ───
	// RateLimitPerMinute caps requests per IP on the authenticated /api
	// routes. The cap is generous by default so local dev feels snappy,
	// but high-fanout clients (browser extension on cold start) won't
	// hit it in normal use.
	RateLimitPerMinute int  `env:"RATE_LIMIT_PER_MINUTE" envDefault:"120"`
	RateLimitDisabled  bool `env:"RATE_LIMIT_DISABLED" envDefault:"false"`

	// ─── Wave 4: Auth ───
	JWTSecret           string `env:"JWT_SECRET"`
	GitHubClientID      string `env:"GITHUB_CLIENT_ID"`
	GitHubClientSecret  string `env:"GITHUB_CLIENT_SECRET"`
	OAuthRedirectURL    string `env:"OAUTH_REDIRECT_URL" envDefault:"http://localhost:5173/auth/callback"`
	AllowedGitHubLogins string `env:"ALLOWED_GITHUB_LOGINS"` // comma-separated, empty = allow all
}

func (c Config) CORSOriginList() []string {
	parts := strings.Split(c.CORSOrigins, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

// AllowedLoginsMap returns a set of allowed GitHub logins.
// Empty map means all logins are allowed.
func (c Config) AllowedLoginsMap() map[string]bool {
	if c.AllowedGitHubLogins == "" {
		return nil
	}
	m := make(map[string]bool)
	for _, l := range strings.Split(c.AllowedGitHubLogins, ",") {
		if s := strings.TrimSpace(l); s != "" {
			m[s] = true
		}
	}
	return m
}

func Load() (Config, error) {
	var c Config
	if err := env.Parse(&c); err != nil {
		return c, err
	}
	if c.AuthMode == "token" && c.APIToken == "" {
		return c, errors.New("API_TOKEN is required when AUTH_MODE=token")
	}
	if c.AuthMode != "token" && c.AuthMode != "jwt" {
		return c, errors.New("AUTH_MODE must be 'token' or 'jwt'")
	}
	return c, nil
}
