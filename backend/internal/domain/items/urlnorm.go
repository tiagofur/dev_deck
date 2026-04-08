package items

import (
	"net/url"
	"strings"
)

// NormalizeURL produces a canonical form used for duplicate detection.
//
// Rules:
//   - scheme is lowercased and "http" is promoted to "https" so users
//     pasting the plain form don't accidentally create duplicates.
//   - host is lowercased and stripped of the leading "www.".
//   - for github.com, trailing ".git" on the repo name is stripped.
//   - path keeps its case but loses the trailing slash.
//   - query parameters that are tracking noise (utm_*, fbclid, gclid,
//     ref, ref_src) are dropped; the rest are kept in sorted order.
//   - fragments (#...) are dropped entirely.
//
// If the URL can't be parsed the raw input is returned lowercased so
// the dedupe query still has something stable to compare against.
func NormalizeURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return strings.ToLower(raw)
	}

	scheme := strings.ToLower(u.Scheme)
	if scheme == "http" {
		scheme = "https"
	}
	if scheme == "" {
		scheme = "https"
	}
	host := strings.ToLower(u.Host)
	host = strings.TrimPrefix(host, "www.")

	path := u.Path
	if host == "github.com" {
		// Strip trailing .git on the repo segment so
		// github.com/foo/bar and github.com/foo/bar.git collide.
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) >= 2 {
			parts[1] = strings.TrimSuffix(parts[1], ".git")
			path = "/" + strings.Join(parts, "/")
		}
	}
	// Strip trailing slash unless path is just "/".
	if len(path) > 1 && strings.HasSuffix(path, "/") {
		path = strings.TrimRight(path, "/")
	}

	// Drop known tracking params, sort the rest so foo?a=1&b=2 and
	// foo?b=2&a=1 produce the same normalized form.
	q := u.Query()
	for _, drop := range trackingParams {
		q.Del(drop)
	}
	encoded := q.Encode() // url.Values.Encode already sorts alphabetically

	out := scheme + "://" + host + path
	if encoded != "" {
		out += "?" + encoded
	}
	return out
}

var trackingParams = []string{
	"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
	"fbclid", "gclid", "mc_cid", "mc_eid",
	"ref", "ref_src", "ref_url",
	"igshid", "yclid",
	"_ga", "_gl",
}
