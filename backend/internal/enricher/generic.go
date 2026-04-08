package enricher

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"devdeck/internal/domain/repos"

	"golang.org/x/net/html"
)

type OpenGraphEnricher struct {
	httpc *http.Client
	// allowInternal disables the SSRF guard. Set to true only from
	// tests that spin up an httptest.Server on 127.0.0.1.
	allowInternal bool
}

func (e *OpenGraphEnricher) Fetch(ctx context.Context, rawURL string) (*repos.Metadata, error) {
	// Wave 4.5 §16.8 — SSRF guard. Reject blocked schemes / private IPs
	// before issuing the request so we don't leak an internal service.
	// An `allowInternal` transport may bypass this at dial time (tests
	// set it via OpenGraphEnricher.allowInternal).
	if !e.allowInternal {
		if err := validateScrapeURL(ctx, rawURL); err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "DevDeck/0.1 (+https://devdeck.local)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := e.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("og fetch: %s", resp.Status)
	}

	// Cap body to 1 MiB — most pages have all <meta> in the first ~50 KiB
	// and we don't want to chew on a hostile or massive page.
	body := io.LimitReader(resp.Body, 1<<20)
	return parseOpenGraph(body)
}

func parseOpenGraph(r io.Reader) (*repos.Metadata, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, err
	}
	md := &repos.Metadata{Topics: []string{}}

	var ogTitle, htmlTitle string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil && htmlTitle == "" {
					htmlTitle = strings.TrimSpace(n.FirstChild.Data)
				}
			case "meta":
				var prop, content string
				for _, a := range n.Attr {
					switch a.Key {
					case "property", "name":
						prop = a.Val
					case "content":
						content = a.Val
					}
				}
				if content == "" {
					return
				}
				switch strings.ToLower(prop) {
				case "og:title":
					ogTitle = content
				case "og:description", "description":
					if md.Description == nil {
						s := content
						md.Description = &s
					}
				case "og:image":
					s := content
					md.OGImageURL = &s
				case "og:url":
					s := content
					md.Homepage = &s
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// We don't have a `Name` field in Metadata (the store derives name on
	// initial insert from the URL), but we expose ogTitle as a fallback
	// description if there's no description at all and ogTitle exists.
	if md.Description == nil {
		switch {
		case ogTitle != "":
			md.Description = &ogTitle
		case htmlTitle != "":
			md.Description = &htmlTitle
		}
	}

	return md, nil
}
