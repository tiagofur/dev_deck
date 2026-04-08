// Package metrics centralises the Prometheus instruments used by the
// backend. All instruments are registered in a single place so tests
// (and handlers) import the same globals rather than passing registries
// around.
//
// Exposed via GET /metrics in the router (internal/http/router.go).
package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// HTTPRequestDuration is a histogram of request latency in seconds,
// labelled by method, route (the chi route pattern, not the raw path,
// so /api/repos/abc-123 shows up as /api/repos/{id}) and status code.
var HTTPRequestDuration = promauto.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "devdeck_http_request_duration_seconds",
		Help:    "Latency of HTTP requests, labelled by method/route/status.",
		Buckets: prometheus.ExponentialBuckets(0.005, 2, 12), // 5ms → ~10s
	},
	[]string{"method", "route", "status"},
)

// HTTPRequestErrors counts 5xx responses by route. Paired with
// HTTPRequestDuration so you can build an "error budget" alert.
var HTTPRequestErrors = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "devdeck_http_request_errors_total",
		Help: "Total 5xx responses, labelled by method/route.",
	},
	[]string{"method", "route"},
)

// EnrichJobs counts background enrichment jobs by outcome. Lets you see
// the "success rate" of the enricher at a glance.
var EnrichJobs = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "devdeck_enrich_jobs_total",
		Help: "Background enrichment jobs, labelled by kind (github/og) and outcome (ok/error/skipped).",
	},
	[]string{"kind", "outcome"},
)

// CaptureItems counts /api/items/capture outcomes by detected type.
// Useful to see which capture channels are actually landing items.
var CaptureItems = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "devdeck_capture_items_total",
		Help: "Items captured via POST /api/items/capture, labelled by source channel, detected item_type, and outcome (created/duplicate/invalid).",
	},
	[]string{"source", "item_type", "outcome"},
)

// Instrument wraps an http.Handler so every request observes the
// latency histogram and (if 5xx) the error counter. Call from the
// router right after chi is set up but before your routes — chi's
// RoutePattern() only works after routing has matched, so we wrap
// inside chi.Route.
//
// Usage:
//
//	r := chi.NewRouter()
//	r.Use(metrics.Instrument)
func Instrument(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()
		next.ServeHTTP(ww, r)

		// Grab the matched route pattern so we don't blow up cardinality
		// with one label per repo UUID. Falls back to the raw path.
		route := r.URL.Path
		if rc := chi.RouteContext(r.Context()); rc != nil {
			if p := rc.RoutePattern(); p != "" {
				route = p
			}
		}
		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}
		HTTPRequestDuration.
			WithLabelValues(r.Method, route, strconv.Itoa(status)).
			Observe(time.Since(start).Seconds())
		if status >= 500 {
			HTTPRequestErrors.WithLabelValues(r.Method, route).Inc()
		}
	})
}
