package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/http/middleware"
)

func TestRequireAdmin(t *testing.T) {
	tests := []struct {
		name           string
		role           string
		hasRole        bool
		expectedStatus int
	}{
		{
			name:           "Authorized Admin",
			role:           "admin",
			hasRole:        true,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Unauthorized User",
			role:           "user",
			hasRole:        true,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Unauthenticated",
			hasRole:        false,
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := middleware.RequireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest("GET", "/", nil)
			if tt.hasRole {
				req = req.WithContext(authctx.WithUserRole(req.Context(), tt.role))
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}
