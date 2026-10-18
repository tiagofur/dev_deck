package main

import "testing"

func TestGitSlug(t *testing.T) {
	tests := []struct {
		name   string
		remote string
		want   string
	}{
		{
			name:   "github_https",
			remote: "https://github.com/tiagofur/heapdeck.git",
			want:   "tiagofur/heapdeck",
		},
		{
			name:   "github_ssh",
			remote: "git@github.com:tiagofur/heapdeck.git",
			want:   "tiagofur/heapdeck",
		},
		{
			name:   "empty",
			remote: "",
			want:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := gitSlug(tt.remote); got != tt.want {
				t.Fatalf("gitSlug(%q) = %q, want %q", tt.remote, got, tt.want)
			}
		})
	}
}

func TestProjectSearchQuery(t *testing.T) {
	got := projectSearchQuery(projectInfo{Name: "heapdeck", GitSlug: "tiagofur/heapdeck"})
	if got != "heapdeck tiagofur/heapdeck" {
		t.Fatalf("projectSearchQuery() = %q", got)
	}
}

