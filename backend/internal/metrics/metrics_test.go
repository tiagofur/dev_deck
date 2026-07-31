package metrics

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	dto "github.com/prometheus/client_model/go"
)

func TestInstrument(t *testing.T) {
	t.Run("records duration and status for happy path", func(t *testing.T) {
		handler := Instrument(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest("GET", "/test-happy", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("increments error counter for 5xx and uses route pattern", func(t *testing.T) {
		r := chi.NewRouter()
		r.Use(Instrument)
		r.Get("/error/{id}", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		})

		req := httptest.NewRequest("GET", "/error/123", nil)
		rec := httptest.NewRecorder()

		// Get initial count for the pattern
		initial := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("GET", "/error/{id}"))

		r.ServeHTTP(rec, req)

		final := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("GET", "/error/{id}"))
		if final != initial+1 {
			t.Errorf("expected error counter to increment for pattern /error/{id}, got %f -> %f", initial, final)
		}
	})

	t.Run("falls back to raw path without chi context", func(t *testing.T) {
		handler := Instrument(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadGateway)
		}))

		req := httptest.NewRequest("POST", "/raw-path", nil)
		rec := httptest.NewRecorder()

		initial := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("POST", "/raw-path"))

		handler.ServeHTTP(rec, req)

		final := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("POST", "/raw-path"))
		if final != initial+1 {
			t.Errorf("expected error counter to increment for raw path, got %f -> %f", initial, final)
		}
	})

	t.Run("handles status 0 as 200 (no error increment)", func(t *testing.T) {
		handler := Instrument(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// No WriteHeader, implicitly 200
		}))

		req := httptest.NewRequest("GET", "/status-zero", nil)
		rec := httptest.NewRecorder()

		initial := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("GET", "/status-zero"))

		handler.ServeHTTP(rec, req)

		final := testutil.ToFloat64(HTTPRequestErrors.WithLabelValues("GET", "/status-zero"))
		if final != initial {
			t.Errorf("expected error counter NOT to increment for status 0, got %f -> %f", initial, final)
		}
	})

	t.Run("records duration in histogram", func(t *testing.T) {
		handler := Instrument(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(10 * time.Millisecond)
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest("GET", "/duration-test", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		// Histograms return an Observer (not a Collector), so fetch the metric
		// and inspect its sample count via the DTO representation instead of
		// using testutil.ToFloat64.
		obs, err := HTTPRequestDuration.GetMetricWithLabelValues("GET", "/duration-test", strconv.Itoa(http.StatusOK))
		if err != nil {
			t.Fatalf("failed to fetch histogram metric: %v", err)
		}
		metric, ok := obs.(prometheus.Metric)
		if !ok {
			t.Fatalf("expected prometheus.Metric, got %T", obs)
		}
		var dtoMetric dto.Metric
		if err := metric.Write(&dtoMetric); err != nil {
			t.Fatalf("failed to write metric: %v", err)
		}
		count := dtoMetric.GetHistogram().GetSampleCount()
		if count < 1 {
			t.Errorf("expected histogram count to be at least 1, got %d", count)
		}
	})
}
