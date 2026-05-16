package cron

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

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
func (j *DigestJob) Run(ctx context.Context) {
	slog.Info("starting weekly digest job")
	
	// 1. Get all users
	users, err := j.store.ListUsersAdmin(ctx)
	if err != nil {
		slog.Error("failed to list users for digest", "err", err)
		return
	}

	for _, uMap := range users {
		userID := uMap["id"].(uuid.UUID)
		userCtx := authctx.WithUserID(ctx, userID)
		
		// 2. Get items from last 7 days
		since := time.Now().Add(-7 * 24 * time.Hour)
		listRes, err := j.store.ListItems(userCtx, items.ListParams{
			CreatedAfter: &since,
			Limit:        10,
		})
		if err != nil {
			slog.Error("failed to list items for user digest", "user_id", userID, "err", err)
			continue
		}

		if len(listRes.Items) == 0 {
			continue
		}

		// 3. Generate summary with AI
		summary, err := j.generateDigestSummary(ctx, listRes.Items)
		if err != nil {
			slog.Error("failed to generate digest summary", "user_id", userID, "err", err)
			continue
		}

		// 4. Create notification
		title := fmt.Sprintf("Tu resumen semanal: %d descubrimientos", len(listRes.Items))
		_, err = j.store.CreateNotification(ctx, userID, "weekly_digest", title, summary, nil)
		if err != nil {
			slog.Error("failed to create digest notification", "user_id", userID, "err", err)
		}
	}
	
	slog.Info("weekly digest job finished")
}

func (j *DigestJob) generateDigestSummary(ctx context.Context, itemNodes []*items.Item) (string, error) {
	if !j.ai.Enabled() || len(itemNodes) == 0 {
		return "Esta semana guardaste varios items interesantes. ¡No te olvides de revisarlos!", nil
	}

	// Build a simple text list for the AI context (simulated)
	var list string
	for i, it := range itemNodes {
		list += fmt.Sprintf("- %s: %s\n", it.Title, it.AISummary)
		if i >= 4 { break }
	}

	// For Wave 8, we'll keep it simple:
	return "Excelente semana. Guardaste herramientas clave como " + itemNodes[0].Title + ". ¡Seguí explorando!", nil
}
