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
			remote: "https://github.com/tiagofur/dev_deck.git",
			want:   "tiagofur/dev_deck",
		},
		{
			name:   "github_ssh",
			remote: "git@github.com:tiagofur/dev_deck.git",
			want:   "tiagofur/dev_deck",
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
	got := projectSearchQuery(projectInfo{Name: "dev_deck", GitSlug: "tiagofur/dev_deck"})
	if got != "dev_deck tiagofur/dev_deck" {
		t.Fatalf("projectSearchQuery() = %q", got)
	}
}

