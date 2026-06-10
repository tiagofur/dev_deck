package cron

import (
	"strings"
	"testing"

	"devdeck/internal/domain/items"
)

func mkItem(title string) *items.Item {
	return &items.Item{Title: title}
}

func TestDigestTitle(t *testing.T) {
	if got := digestTitle(1); got != "Your weekly digest: 1 new find" {
		t.Errorf("singular title: %q", got)
	}
	if got := digestTitle(7); got != "Your weekly digest: 7 new finds" {
		t.Errorf("plural title: %q", got)
	}
}

func TestBuildDigestSummary_ListsTitles(t *testing.T) {
	summary := buildDigestSummary([]*items.Item{mkItem("ripgrep"), mkItem("fzf")}, 2)

	if !strings.Contains(summary, "• ripgrep") || !strings.Contains(summary, "• fzf") {
		t.Errorf("expected both titles in summary, got:\n%s", summary)
	}
	if strings.Contains(summary, "more in your vault") {
		t.Errorf("should not mention overflow when everything fits, got:\n%s", summary)
	}
}

func TestBuildDigestSummary_CapsTitlesAndShowsOverflow(t *testing.T) {
	var list []*items.Item
	for _, title := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		list = append(list, mkItem(title))
	}

	summary := buildDigestSummary(list, 9)

	if strings.Contains(summary, "• f") {
		t.Errorf("expected at most %d titles, got:\n%s", digestMaxTitles, summary)
	}
	if !strings.Contains(summary, "…and 4 more in your vault.") {
		t.Errorf("expected overflow line for 9 total with 5 shown, got:\n%s", summary)
	}
}

func TestBuildDigestSummary_HandlesUntitledItems(t *testing.T) {
	summary := buildDigestSummary([]*items.Item{mkItem("  ")}, 1)

	if !strings.Contains(summary, "• (untitled)") {
		t.Errorf("expected placeholder for blank titles, got:\n%s", summary)
	}
}
