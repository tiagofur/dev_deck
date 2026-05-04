package config

import (
	"errors"
	"slices"
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
	JWTSecret               string `env:"JWT_SECRET"`
	GitHubClientID          string `env:"GITHUB_CLIENT_ID"`
	GitHubClientSecret      string `env:"GITHUB_CLIENT_SECRET"`
	GitHubOAuthCallbackURL  string `env:"GITHUB_OAUTH_CALLBACK_URL" envDefault:"http://localhost:8080/api/auth/github/callback"`
	GoogleClientID          string `env:"GOOGLE_CLIENT_ID"`
	GoogleClientSecret      string `env:"GOOGLE_CLIENT_SECRET"`
	GoogleOAuthCallbackURL  string `env:"GOOGLE_OAUTH_CALLBACK_URL" envDefault:"http://localhost:8080/api/auth/google/callback"`
	AppleClientID           string `env:"APPLE_CLIENT_ID"`
	AppleTeamID             string `env:"APPLE_TEAM_ID"`
	AppleKeyID              string `env:"APPLE_KEY_ID"`
	ApplePrivateKey         string `env:"APPLE_PRIVATE_KEY"`
	AppleOAuthCallbackURL   string `env:"APPLE_OAUTH_CALLBACK_URL" envDefault:"http://localhost:8080/api/auth/apple/callback"`
	WebOAuthRedirectURL     string `env:"WEB_OAUTH_REDIRECT_URL" envDefault:"http://localhost:5173/auth/callback"`
	DesktopOAuthRedirectURL string `env:"DESKTOP_OAUTH_REDIRECT_URL" envDefault:"devdeck://auth/callback"`
	AllowedGitHubLogins     string `env:"ALLOWED_GITHUB_LOGINS"` // legacy single-user option

	// ─── Wave 7: Local Auth & Email ───
	LocalAuthEnabled bool   `env:"LOCAL_AUTH_ENABLED" envDefault:"false"`
	ResendAPIKey     string `env:"RESEND_API_KEY"`
	FrontendURL      string `env:"FRONTEND_URL" envDefault:"http://localhost:5173"`

	// ─── Wave 5 Fase 18: local AI enrichment ───
	AIProvider       string `env:"AI_PROVIDER" envDefault:"heuristic"`
	OpenAIAPIKey    string `env:"OPENAI_API_KEY"`
	OpenAIModel    string `env:"OPENAI_MODEL" envDefault:"gpt-4o-mini"`
	QwenAPIKey     string `env:"QWEN_API_KEY"`     // Alibaba DashScope
	QwenModel      string `env:"QWEN_MODEL" envDefault:"qwen-turbo"`
	DeepSeekAPIKey string `env:"DEEPSEEK_API_KEY"`
	DeepSeekModel  string `env:"DEEPSEEK_MODEL" envDefault:"deepseek-chat"`
	AIExternalOptIn bool  `env:"AI_EXTERNAL_OPT_IN" envDefault:"false"`
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

func (c Config) EnabledAuthProviders() []string {
	providers := []string{}
	if strings.TrimSpace(c.GitHubClientID) != "" && strings.TrimSpace(c.GitHubClientSecret) != "" {
		providers = append(providers, "github")
	}
	if strings.TrimSpace(c.GoogleClientID) != "" && strings.TrimSpace(c.GoogleClientSecret) != "" {
		providers = append(providers, "google")
	}
	if strings.TrimSpace(c.AppleClientID) != "" &&
		strings.TrimSpace(c.AppleTeamID) != "" &&
		strings.TrimSpace(c.AppleKeyID) != "" &&
		strings.TrimSpace(c.ApplePrivateKey) != "" {
		providers = append(providers, "apple")
	}
	slices.Sort(providers)
	return providers
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
	if c.AuthMode == "jwt" {
		if strings.TrimSpace(c.JWTSecret) == "" {
			return c, errors.New("JWT_SECRET is required when AUTH_MODE=jwt")
		}
		if !c.LocalAuthEnabled && len(c.EnabledAuthProviders()) == 0 {
			return c, errors.New("at least one auth method (local or OAuth) must be configured when AUTH_MODE=jwt")
		}
	}
	switch strings.ToLower(strings.TrimSpace(c.AIProvider)) {
	case "", "heuristic", "local", "disabled", "off", "none", "openai", "qwen", "deepseek":
	default:
		return c, errors.New("AI_PROVIDER must be one of: heuristic, local, disabled, openai, qwen, deepseek")
	}
	if strings.EqualFold(strings.TrimSpace(c.AIProvider), "openai") {
		if !c.AIExternalOptIn {
			return c, errors.New("AI_EXTERNAL_OPT_IN=true is required when AI_PROVIDER=openai")
		}
		if strings.TrimSpace(c.OpenAIAPIKey) == "" {
			return c, errors.New("OPENAI_API_KEY is required when AI_PROVIDER=openai")
		}
	}
	if strings.EqualFold(strings.TrimSpace(c.AIProvider), "qwen") {
		if !c.AIExternalOptIn {
			return c, errors.New("AI_EXTERNAL_OPT_IN=true is required when AI_PROVIDER=qwen")
		}
		if strings.TrimSpace(c.QwenAPIKey) == "" {
			return c, errors.New("QWEN_API_KEY is required when AI_PROVIDER=qwen")
		}
	}
	if strings.EqualFold(strings.TrimSpace(c.AIProvider), "deepseek") {
		if !c.AIExternalOptIn {
			return c, errors.New("AI_EXTERNAL_OPT_IN=true is required when AI_PROVIDER=deepseek")
		}
		if strings.TrimSpace(c.DeepSeekAPIKey) == "" {
			return c, errors.New("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek")
		}
	}
	return c, nil
}
