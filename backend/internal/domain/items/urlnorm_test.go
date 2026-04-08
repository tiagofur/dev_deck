package items

import "testing"

func TestNormalizeURL(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "github_trailing_git",
			in:   "https://github.com/foo/bar.git",
			want: "https://github.com/foo/bar",
		},
		{
			name: "http_promoted_to_https",
			in:   "http://example.com/path",
			want: "https://example.com/path",
		},
		{
			name: "www_stripped",
			in:   "https://www.example.com/path",
			want: "https://example.com/path",
		},
		{
			name: "trailing_slash_stripped",
			in:   "https://example.com/path/",
			want: "https://example.com/path",
		},
		{
			name: "root_slash_kept",
			in:   "https://example.com/",
			want: "https://example.com/",
		},
		{
			name: "tracking_params_dropped",
			in:   "https://example.com/post?utm_source=twitter&utm_campaign=x&id=42",
			want: "https://example.com/post?id=42",
		},
		{
			name: "fragment_dropped",
			in:   "https://example.com/post#intro",
			want: "https://example.com/post",
		},
		{
			name: "case_insensitive_host",
			in:   "https://Example.COM/Path",
			want: "https://example.com/Path",
		},
		{
			name: "query_params_sorted",
			in:   "https://example.com/x?b=2&a=1",
			want: "https://example.com/x?a=1&b=2",
		},
		{
			name: "empty_input",
			in:   "",
			want: "",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := NormalizeURL(tc.in)
			if got != tc.want {
				t.Errorf("NormalizeURL(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestNormalizeURL_DuplicateDetection(t *testing.T) {
	// All of these should produce the same normalized URL, so the
	// capture handler treats them as duplicates.
	variants := []string{
		"https://github.com/charmbracelet/bubbletea",
		"http://github.com/charmbracelet/bubbletea",
		"https://github.com/charmbracelet/bubbletea.git",
		"https://github.com/charmbracelet/bubbletea/",
		"https://www.github.com/charmbracelet/bubbletea",
		"https://github.com/charmbracelet/bubbletea?utm_source=twitter",
		"https://github.com/charmbracelet/bubbletea#readme",
	}
	want := "https://github.com/charmbracelet/bubbletea"
	for _, v := range variants {
		got := NormalizeURL(v)
		if got != want {
			t.Errorf("NormalizeURL(%q) = %q, want %q", v, got, want)
		}
	}
}
