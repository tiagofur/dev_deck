package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	client *redis.Client
}

func New(redisURL string) (*Cache, error) {
	if redisURL == "" {
		return nil, nil // Disabled
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	return &Cache{client: client}, nil
}

func (c *Cache) Enabled() bool {
	return c != nil && c.client != nil
}

func (c *Cache) Get(ctx context.Context, key string, out any) (bool, error) {
	if !c.Enabled() {
		return false, nil
	}
	val, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	err = json.Unmarshal(val, out)
	return err == nil, err
}

func (c *Cache) Set(ctx context.Context, key string, val any, ttl time.Duration) error {
	if !c.Enabled() {
		return nil
	}
	data, err := json.Marshal(val)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, data, ttl).Err()
}

func (c *Cache) Delete(ctx context.Context, key string) error {
	if !c.Enabled() {
		return nil
	}
	return c.client.Del(ctx, key).Err()
}
