package ai

import (
	"context"
	"errors"
	"strings"

	"devdeck/internal/config"
	"devdeck/internal/domain/items"
)

// Input is the sanitized subset of an item we allow the AI layer to see.
// Even for the local heuristic provider we keep the same boundary so future
// external providers don't accidentally start depending on private fields.
type Input struct {
	Type        items.Type
	Title       string
	Description string
	URL         *string
	Meta        map[string]any
}

// Output is the suggestion payload written back to the item row.
type Output struct {
	Summary string
	Tags    []string
}

type Classifier interface {
	SuggestTags(ctx context.Context, in Input) ([]string, error)
	Enabled() bool
}

type Summarizer interface {
	Summarize(ctx context.Context, in Input) (string, error)
	Enabled() bool
}

// Service coordinates tag + summary generation.
type Service struct {
	classifier Classifier
	summarizer Summarizer
}

func New(provider string) *Service {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "", "heuristic", "local":
		return NewHeuristic()
	case "openai":
		return &Service{} // caller must call NewOpenAI() with API key
	case "qwen":
		return &Service{} // caller must call NewQwen() with API key
	case "deepseek":
		return &Service{} // caller must call NewDeepSeek() with API key
	case "disabled", "off", "none":
		return NewDisabled()
	default:
		return NewDisabled()
	}
}

func NewFromConfig(cfg config.Config) *Service {
	switch strings.ToLower(strings.TrimSpace(cfg.AIProvider)) {
	case "openai":
		return NewOpenAI(cfg.OpenAIAPIKey, cfg.OpenAIModel)
	case "qwen":
		return NewQwen(cfg.QwenAPIKey, cfg.QwenModel)
	case "deepseek":
		return NewDeepSeek(cfg.DeepSeekAPIKey, cfg.DeepSeekModel)
	default:
		return New(cfg.AIProvider)
	}
}

func NewWith(classifier Classifier, summarizer Summarizer) *Service {
	return &Service{classifier: classifier, summarizer: summarizer}
}

func NewDisabled() *Service {
	d := disabledProvider{}
	return NewWith(d, d)
}

func NewHeuristic() *Service {
	h := heuristicProvider{}
	return NewWith(h, h)
}

func (s *Service) Enabled() bool {
	if s == nil {
		return false
	}
	return (s.classifier != nil && s.classifier.Enabled()) ||
		(s.summarizer != nil && s.summarizer.Enabled())
}

func (s *Service) EnrichItem(ctx context.Context, item *items.Item) (Output, error) {
	if item == nil {
		return Output{}, errors.New("nil item")
	}
	if s == nil || !s.Enabled() {
		return Output{}, nil
	}

	in := SanitizeForAI(item)

	var out Output
	var errs []error

	if s.summarizer != nil && s.summarizer.Enabled() {
		summary, err := s.summarizer.Summarize(ctx, in)
		if err != nil {
			errs = append(errs, err)
		} else {
			out.Summary = strings.TrimSpace(summary)
		}
	}

	if s.classifier != nil && s.classifier.Enabled() {
		tags, err := s.classifier.SuggestTags(ctx, in)
		if err != nil {
			errs = append(errs, err)
		} else {
			out.Tags = uniqueTags(tags)
		}
	}

	return out, errors.Join(errs...)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
