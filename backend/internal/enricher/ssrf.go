package enricher

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Wave 4.5 §16.8 — SSRF guard.
//
// The generic Open Graph scraper will fetch any URL we feed it. Without
// guardrails, a malicious user could capture a URL pointing at an
// internal service (e.g. http://169.254.169.254/latest/meta-data on
// AWS, or http://10.0.0.5:8500 for an internal Consul) and our backend
// would happily fetch it from inside the VPC.
//
// This file provides:
//   - allowedSchemes: only http/https are fetched, anything else is denied.
//   - privateIP / isBlockedIP: reject IPs in RFC1918/RFC6598/RFC3927,
//     loopback, link-local, multicast, unspecified, and the AWS/GCP
//     metadata IP.
//   - resolveAndCheck: performs DNS resolution before the request and
//     rejects if any resolved IP is on the blocklist.
//   - ssrfSafeTransport: an http.Transport whose DialContext wraps the
//     real dialer and refuses to connect if the IP it's about to reach
//     is blocked. This also catches the "resolve to 8.8.8.8, then
//     rebind to 127.0.0.1" DNS-rebinding attack because the check
//     happens at dial time, after the final DNS lookup.

var (
	// ErrBlockedScheme is returned if the URL uses a scheme other than http(s).
	ErrBlockedScheme = errors.New("ssrf: scheme not allowed")
	// ErrBlockedHost is returned if the URL host is empty or invalid.
	ErrBlockedHost = errors.New("ssrf: host invalid")
	// ErrBlockedIP is returned if any resolved IP is on the blocklist.
	ErrBlockedIP = errors.New("ssrf: ip in blocked range")
)

// allowedSchemes is the whitelist for the generic enricher. GitHub
// enrichment doesn't go through this (it always hits api.github.com).
var allowedSchemes = map[string]bool{"http": true, "https": true}

// blockedCIDRs covers every address space we don't want to talk to.
// The list is intentionally broad — enrichment is best-effort anyway,
// so false positives are cheaper than false negatives here.
var blockedCIDRs = func() []*net.IPNet {
	raw := []string{
		"10.0.0.0/8",     // RFC1918
		"172.16.0.0/12",  // RFC1918
		"192.168.0.0/16", // RFC1918
		"100.64.0.0/10",  // RFC6598 (carrier-grade NAT)
		"169.254.0.0/16", // RFC3927 link-local (AWS metadata lives here)
		"127.0.0.0/8",    // loopback
		"0.0.0.0/8",      // "this network"
		"224.0.0.0/4",    // multicast
		"240.0.0.0/4",    // reserved
		"::1/128",        // IPv6 loopback
		"fe80::/10",      // IPv6 link-local
		"fc00::/7",       // IPv6 unique local
		"ff00::/8",       // IPv6 multicast
	}
	out := make([]*net.IPNet, 0, len(raw))
	for _, c := range raw {
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			panic("invalid CIDR in blocklist: " + c)
		}
		out = append(out, n)
	}
	return out
}()

// isBlockedIP returns true if ip is on the blocklist. Nil/unspecified
// addresses are also blocked so a user can't sneak through with "0.0.0.0".
func isBlockedIP(ip net.IP) bool {
	if ip == nil || ip.IsUnspecified() || ip.IsLoopback() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() {
		return true
	}
	for _, n := range blockedCIDRs {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// validateScrapeURL runs the URL through the scheme + DNS + IP checks.
// Callers get a concrete error (ErrBlockedScheme/Host/IP) they can log
// without leaking the URL back to the user.
func validateScrapeURL(ctx context.Context, rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrBlockedHost, err)
	}
	if !allowedSchemes[strings.ToLower(u.Scheme)] {
		return ErrBlockedScheme
	}
	host := u.Hostname()
	if host == "" {
		return ErrBlockedHost
	}
	// If the host is a literal IP, check it directly.
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return ErrBlockedIP
		}
		return nil
	}
	// DNS lookup with a short timeout.
	lookupCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	resolver := net.DefaultResolver
	ips, err := resolver.LookupIPAddr(lookupCtx, host)
	if err != nil {
		return fmt.Errorf("ssrf: dns lookup failed: %w", err)
	}
	if len(ips) == 0 {
		return fmt.Errorf("%w: no ips for %s", ErrBlockedHost, host)
	}
	for _, ip := range ips {
		if isBlockedIP(ip.IP) {
			return ErrBlockedIP
		}
	}
	return nil
}

// ssrfSafeTransport returns an http.Transport whose DialContext checks
// the resolved address against the blocklist before opening the socket.
// This closes the DNS-rebinding gap that a single-shot
// validateScrapeURL call can't cover on its own.
func ssrfSafeTransport(timeout time.Duration) *http.Transport {
	dialer := &net.Dialer{Timeout: timeout}
	return &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			// Literal IP: validate directly.
			if ip := net.ParseIP(host); ip != nil {
				if isBlockedIP(ip) {
					return nil, ErrBlockedIP
				}
				return dialer.DialContext(ctx, network, addr)
			}
			// Resolve + verify every IP before dialing.
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, err
			}
			for _, ip := range ips {
				if isBlockedIP(ip.IP) {
					return nil, ErrBlockedIP
				}
			}
			// Dial the first IP to avoid a re-resolve race.
			for _, ip := range ips {
				conn, derr := dialer.DialContext(ctx, network, net.JoinHostPort(ip.IP.String(), port))
				if derr == nil {
					return conn, nil
				}
				err = derr
			}
			return nil, err
		},
		MaxIdleConns:          10,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
	}
}
