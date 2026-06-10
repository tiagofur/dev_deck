package cron

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// digestMaxTitles caps how many item titles appear in the digest body.
const digestMaxTitles = 5

type DigestJob struct {
	store *store.Store
	ai    *ai.Service
}

func NewDigestJob(s *store.Store, aiSvc *ai.Service) *DigestJob {
	return &DigestJob{
		store: s,
		ai:    aiSvc,
	}
}

// Run executes the digest generation for all active users.
//
// The digest is provider-independent by design: it is a deterministic list
// of what the user saved in the last week, so the notification bell works
// for the majority of users who never configure an AI provider. AI-flavored
// summaries can be layered on top later without changing this contract.
func (j *DigestJob) Run(ctx context.Context) {
	slog.Info("starting weekly digest job")

	users, err := j.store.ListUsersAdmin(ctx)
	if err != nil {
		slog.Error("failed to list users for digest", "err", err)
		return
	}

	weekAgo := time.Now().AddDate(0, 0, -7)

	for _, uMap := range users {
		userID := uMap["id"].(uuid.UUID)
		userCtx := authctx.WithUserID(ctx, userID)

		listRes, err := j.store.ListItems(userCtx, items.ListParams{
			Limit:        10,
			CreatedAfter: &weekAgo,
		})
		if err != nil {
			slog.Error("failed to list items for user digest", "user_id", userID, "err", err)
			continue
		}

		// Nothing new this week: stay silent instead of repeating stale digests.
		if len(listRes.Items) == 0 {
			continue
		}

		count := listRes.Total
		if count < len(listRes.Items) {
			count = len(listRes.Items)
		}

		title := digestTitle(count)
		summary := buildDigestSummary(listRes.Items, count)

		if _, err := j.store.CreateNotification(ctx, userID, "weekly_digest", title, summary, nil); err != nil {
			slog.Error("failed to create digest notification", "user_id", userID, "err", err)
		}
	}

	slog.Info("weekly digest job finished")
}

func digestTitle(count int) string {
	if count == 1 {
		return "Your weekly digest: 1 new find"
	}
	return fmt.Sprintf("Your weekly digest: %d new finds", count)
}

// buildDigestSummary renders the digest body without requiring any AI
// provider: the newest item titles from the past week, plus a hint when
// there are more than fit.
func buildDigestSummary(itemNodes []*items.Item, total int) string {
	var b strings.Builder
	b.WriteString("Saved this week:\n")

	shown := len(itemNodes)
	if shown > digestMaxTitles {
		shown = digestMaxTitles
	}
	for _, it := range itemNodes[:shown] {
		title := strings.TrimSpace(it.Title)
		if title == "" {
			title = "(untitled)"
		}
		b.WriteString("• " + title + "\n")
	}

	if total > shown {
		b.WriteString(fmt.Sprintf("…and %d more in your vault.\n", total-shown))
	}

	b.WriteString("\nRevisit them before they fade.")
	return b.String()
}
