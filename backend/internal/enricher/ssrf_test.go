package enricher

import (
	"context"
	"errors"
	"net"
	"testing"
)

func TestIsBlockedIP(t *testing.T) {
	cases := []struct {
		ip      string
		blocked bool
	}{
		// Public IPs — should be allowed.
		{"1.1.1.1", false},
		{"8.8.8.8", false},
		{"185.199.108.153", false}, // GitHub pages
		// Private (RFC1918).
		{"10.0.0.1", true},
		{"172.16.5.5", true},
		{"192.168.1.1", true},
		// Loopback.
		{"127.0.0.1", true},
		{"127.255.255.255", true},
		// Carrier-grade NAT (RFC6598).
		{"100.64.1.1", true},
		// AWS metadata (RFC3927 link-local).
		{"169.254.169.254", true},
		// Unspecified.
		{"0.0.0.0", true},
		// Multicast.
		{"224.0.0.1", true},
		// IPv6 loopback.
		{"::1", true},
		// IPv6 link-local.
		{"fe80::1", true},
		// IPv6 unique local.
		{"fc00::1", true},
	}
	for _, tc := range cases {
		ip := net.ParseIP(tc.ip)
		if got := isBlockedIP(ip); got != tc.blocked {
			t.Errorf("isBlockedIP(%s) = %v, want %v", tc.ip, got, tc.blocked)
		}
	}
}

func TestValidateScrapeURL_RejectsBlockedSchemes(t *testing.T) {
	badSchemes := []string{
		"file:///etc/passwd",
		"gopher://example.com",
		"ftp://example.com/",
		"javascript:alert(1)",
	}
	for _, u := range badSchemes {
		err := validateScrapeURL(context.Background(), u)
		if !errors.Is(err, ErrBlockedScheme) {
			t.Errorf("validateScrapeURL(%q) = %v, want ErrBlockedScheme", u, err)
		}
	}
}

func TestValidateScrapeURL_RejectsLoopbackLiteral(t *testing.T) {
	err := validateScrapeURL(context.Background(), "http://127.0.0.1:8080/foo")
	if !errors.Is(err, ErrBlockedIP) {
		t.Errorf("expected ErrBlockedIP for 127.0.0.1, got %v", err)
	}
}

func TestValidateScrapeURL_RejectsPrivateLiteral(t *testing.T) {
	err := validateScrapeURL(context.Background(), "https://10.0.0.5/admin")
	if !errors.Is(err, ErrBlockedIP) {
		t.Errorf("expected ErrBlockedIP for 10.0.0.5, got %v", err)
	}
}

func TestValidateScrapeURL_RejectsAWSMetadata(t *testing.T) {
	err := validateScrapeURL(context.Background(), "http://169.254.169.254/latest/meta-data/")
	if !errors.Is(err, ErrBlockedIP) {
		t.Errorf("expected ErrBlockedIP for AWS metadata, got %v", err)
	}
}

func TestValidateScrapeURL_RejectsEmptyHost(t *testing.T) {
	err := validateScrapeURL(context.Background(), "https://")
	if !errors.Is(err, ErrBlockedHost) {
		t.Errorf("expected ErrBlockedHost, got %v", err)
	}
}

func TestValidateOwnerRepo(t *testing.T) {
	good := []struct{ owner, repo string }{
		{"charmbracelet", "bubbletea"},
		{"a", "b"},
		{"foo_bar", "baz-qux"},
		{"foo.bar", "x.y"},
	}
	for _, tc := range good {
		if err := validateOwnerRepo(tc.owner, tc.repo); err != nil {
			t.Errorf("validateOwnerRepo(%q,%q) = %v, want nil", tc.owner, tc.repo, err)
		}
	}

	bad := []struct{ owner, repo string }{
		{"", "bar"},
		{"foo", ""},
		{"foo/../secrets", "bar"},
		{"foo bar", "baz"},
		{"foo", "bar?query"},
		{"foo", "bar#frag"},
		{"foo", "bar;drop-table"},
	}
	for _, tc := range bad {
		if err := validateOwnerRepo(tc.owner, tc.repo); err == nil {
			t.Errorf("validateOwnerRepo(%q,%q) should fail, got nil", tc.owner, tc.repo)
		}
	}
}

func TestGitHubEnricher_Fetch_RejectsBadIdentifier(t *testing.T) {
	// No server needed — the regex check fires before the HTTP request.
	en := newTestEnricher("http://127.0.0.1:9999")
	_, err := en.Fetch(context.Background(), "foo/../secrets", "bar")
	if !errors.Is(err, ErrInvalidGitHubIdentifier) {
		t.Errorf("expected ErrInvalidGitHubIdentifier, got %v", err)
	}
}
