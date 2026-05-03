package jobs

import "testing"

func TestResolveStatus(t *testing.T) {
	tests := []struct {
		name      string
		processed bool
		hadError  bool
		want      string
	}{
		{"all_ok", true, false, "ok"},
		{"partial_error", true, true, "error"}, // This is the bug case
		{"full_error", false, true, "error"},
		{"skipped", false, false, "skipped"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveStatus(tt.processed, tt.hadError)
			if got != tt.want {
				t.Errorf("resolveStatus() = %q, want %q", got, tt.want)
			}
		})
	}
}
