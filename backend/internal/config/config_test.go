package config

import (
	"os"
	"testing"
)

func TestConfig_CORSOriginList(t *testing.T) {
	tests := []struct {
		name        string
		corsOrigins string
		want        []string
	}{
		{
			name:        "Standard origins",
			corsOrigins: "http://localhost:3000,https://example.com",
			want:        []string{"http://localhost:3000", "https://example.com"},
		},
		{
			name:        "Origins with spaces",
			corsOrigins: " http://localhost:3000 ,  https://example.com  ",
			want:        []string{"http://localhost:3000", "https://example.com"},
		},
		{
			name:        "Empty elements",
			corsOrigins: "http://localhost:3000,,https://example.com",
			want:        []string{"http://localhost:3000", "https://example.com"},
		},
		{
			name:        "Empty string",
			corsOrigins: "",
			want:        []string{},
		},
		{
			name:        "Only spaces and commas",
			corsOrigins: " ,  ,, ",
			want:        []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := Config{CORSOrigins: tt.corsOrigins}
			got := c.CORSOriginList()
			if len(got) != len(tt.want) {
				t.Fatalf("got len %d, want %d", len(got), len(tt.want))
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("at index %d: got %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestConfig_AllowedLoginsMap(t *testing.T) {
	tests := []struct {
		name                string
		allowedGitHubLogins string
		want                map[string]bool
	}{
		{
			name:                "Standard logins",
			allowedGitHubLogins: "user1,user2",
			want:                map[string]bool{"user1": true, "user2": true},
		},
		{
			name:                "Logins with spaces",
			allowedGitHubLogins: " user1 ,  user2 ",
			want:                map[string]bool{"user1": true, "user2": true},
		},
		{
			name:                "Empty string",
			allowedGitHubLogins: "",
			want:                nil,
		},
		{
			name:                "Only spaces and commas",
			allowedGitHubLogins: " , , ",
			want:                map[string]bool{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := Config{AllowedGitHubLogins: tt.allowedGitHubLogins}
			got := c.AllowedLoginsMap()
			if tt.want == nil {
				if got != nil {
					t.Errorf("got %v, want nil", got)
				}
				return
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got len %d, want %d", len(got), len(tt.want))
			}
			for k := range tt.want {
				if !got[k] {
					t.Errorf("missing key %q", k)
				}
			}
		})
	}
}

func TestLoad(t *testing.T) {
	// Helper to set and unset env vars
	setenv := func(t *testing.T, key, val string) {
		old, exists := os.LookupEnv(key)
		os.Setenv(key, val)
		t.Cleanup(func() {
			if exists {
				os.Setenv(key, old)
			} else {
				os.Unsetenv(key)
			}
		})
	}

	t.Run("Successful load with default values", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "API_TOKEN", "test-token")
		setenv(t, "PORT", "8080")
		setenv(t, "AUTH_MODE", "token")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if cfg.Port != "8080" {
			t.Errorf("got port %q, want 8080", cfg.Port)
		}
		if cfg.DBURL != "postgres://localhost:5432/db" {
			t.Errorf("got dburl %q, want postgres://localhost:5432/db", cfg.DBURL)
		}
		if cfg.AuthMode != "token" {
			t.Errorf("got authmode %q, want token", cfg.AuthMode)
		}
		if cfg.APIToken != "test-token" {
			t.Errorf("got apitoken %q, want test-token", cfg.APIToken)
		}
	})

	t.Run("Missing API_TOKEN when AuthMode is token", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "AUTH_MODE", "token")
		os.Unsetenv("API_TOKEN")

		_, err := Load()
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Invalid AuthMode", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "AUTH_MODE", "invalid")

		_, err := Load()
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("JWT AuthMode without API_TOKEN is OK", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "AUTH_MODE", "jwt")
		setenv(t, "JWT_SECRET", "secret")
		setenv(t, "GITHUB_CLIENT_ID", "gh-client")
		setenv(t, "GITHUB_CLIENT_SECRET", "gh-secret")
		os.Unsetenv("API_TOKEN")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if cfg.AuthMode != "jwt" {
			t.Errorf("got authmode %q, want jwt", cfg.AuthMode)
		}
	})

	t.Run("OpenAI requires explicit opt-in and key", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "AUTH_MODE", "token")
		setenv(t, "API_TOKEN", "test-token")
		setenv(t, "AI_PROVIDER", "openai")
		os.Unsetenv("AI_EXTERNAL_OPT_IN")
		os.Unsetenv("OPENAI_API_KEY")

		_, err := Load()
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("OpenAI loads when opted in", func(t *testing.T) {
		setenv(t, "DB_URL", "postgres://localhost:5432/db")
		setenv(t, "AUTH_MODE", "token")
		setenv(t, "API_TOKEN", "test-token")
		setenv(t, "AI_PROVIDER", "openai")
		setenv(t, "AI_EXTERNAL_OPT_IN", "true")
		setenv(t, "OPENAI_API_KEY", "sk-test")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if cfg.AIProvider != "openai" {
			t.Fatalf("provider = %q", cfg.AIProvider)
		}
	})
}

func TestConfig_EnabledAuthProviders(t *testing.T) {
	cfg := Config{
		GitHubClientID:     "gh-id",
		GitHubClientSecret: "gh-secret",
		GoogleClientID:     "google-id",
		GoogleClientSecret: "google-secret",
	}

	got := cfg.EnabledAuthProviders()
	want := []string{"github", "google"}
	if len(got) != len(want) {
		t.Fatalf("got len %d, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("provider[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}
