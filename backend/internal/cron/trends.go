package cron

import (
	"context"
	"log/slog"
	"time"

	"devdeck/internal/store"
	"devdeck/internal/webhooks"

	"github.com/google/uuid"
)

// TrendsChecker scans all organizations for hot topics and fires alerts via webhooks.
type TrendsChecker struct {
	store *store.Store
	hooks *webhooks.Service
}

func NewTrendsChecker(st *store.Store, ws *webhooks.Service) *TrendsChecker {
	return &TrendsChecker{store: st, hooks: ws}
}

func (c *TrendsChecker) Start(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour) // Run once a day
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.CheckAll(ctx)
			}
		}
	}()
}

func (c *TrendsChecker) CheckAll(ctx context.Context) {
	orgs, err := c.store.ListAllOrganizations(ctx)
	if err != nil {
		slog.Error("cron: trends checker failed to list orgs", "err", err)
		return
	}

	for _, o := range orgs {
		c.checkOrg(ctx, o.ID)
	}
}

func (c *TrendsChecker) checkOrg(ctx context.Context, orgID uuid.UUID) {
	// Threshold: tag used > 10 times in 30 days
	tags, err := c.store.GetOrgTrendingTags(ctx, orgID, 5)
	if err != nil {
		return
	}

	for _, t := range tags {
		if t.Count >= 10 {
			slog.Info("cron: firing team alert for trending topic", "org_id", orgID, "tag", t.Tag)
			c.hooks.Dispatch(ctx, orgID, uuid.Nil, "org.trending_topic", "organization", orgID, map[string]any{
				"tag":   t.Tag,
				"count": t.Count,
				"msg":   "¡Nueva tendencia en el equipo! El tema '" + t.Tag + "' está siendo muy guardado.",
			})
		}
	}
}
