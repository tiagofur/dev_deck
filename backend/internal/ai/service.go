package ai

import (
	"context"
	"errors"
	"strings"

	"heapdeck/internal/ai/agent"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/items"
)

// Input is the sanitized subset of an item we allow the AI layer to see.
type Input struct {
	Type        items.Type
	Title       string
	Description string
	URL         *string
	Meta        map[string]any
	WhySaved    string
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

// DetailedClassifier is an optional extension: providers that report token
// usage implement SuggestTagsDetailed so metering can price the call.
type DetailedClassifier interface {
	Classifier
	SuggestTagsDetailed(ctx context.Context, in Input) (tags []string, usage *Usage, err error)
}

// DetailedSummarizer is the Summarizer counterpart for usage reporting.
type DetailedSummarizer interface {
	Summarizer
	SummarizeDetailed(ctx context.Context, in Input) (summary string, usage *Usage, err error)
}

// DetailedOutput pairs an enrichment result with its priced usage.
type DetailedOutput struct {
	Output
	// Usage sums both calls (summarize + tags). Nil when the provider
	// reports nothing (local/heuristic) — callers then record $0.
	Usage *Usage
	// Model is the concrete model string for cost lookup.
	Model string
}

// Service coordinates tag + summary generation and agent chat.
type Service struct {
	classifier Classifier
	summarizer Summarizer
	agent      agent.Agent
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
	var s *Service
	switch strings.ToLower(strings.TrimSpace(cfg.AIProvider)) {
	case "openai":
		s = NewOpenAI(cfg.OpenAIAPIKey, cfg.OpenAIModel)
		s.agent = NewAgentOpenAI(cfg.OpenAIAPIKey, cfg.OpenAIModel)
	case "ollama":
		s = NewOllama(cfg.OllamaBaseURL, cfg.OllamaModel)
		s.agent = NewAgentOllama(cfg.OllamaBaseURL, cfg.OllamaModel)
	case "lmstudio":
		s = NewLMStudio(cfg.LMStudioBaseURL, cfg.LMStudioModel)
		s.agent = NewAgentLMStudio(cfg.LMStudioBaseURL, cfg.LMStudioModel)
	case "qwen":
		s = NewQwen(cfg.QwenAPIKey, cfg.QwenModel)
	case "deepseek":
		s = NewDeepSeek(cfg.DeepSeekAPIKey, cfg.DeepSeekModel)
	default:
		s = New(cfg.AIProvider)
	}
	return s
}

func (s *Service) Agent() agent.Agent {
	if s == nil {
		return nil
	}
	return s.agent
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
		(s.summarizer != nil && s.summarizer.Enabled()) ||
		(s.agent != nil && s.agent.Enabled())
}

func (s *Service) EnrichItem(ctx context.Context, item *items.Item) (Output, error) {
	detailed, err := s.EnrichItemDetailed(ctx, item)
	return detailed.Output, err
}

// EnrichItemDetailed is EnrichItem plus priced token usage. Providers
// implementing the Detailed* interfaces report real usage; the rest yield
// nil Usage and callers record $0 (local/heuristic) or estimate.
func (s *Service) EnrichItemDetailed(ctx context.Context, item *items.Item) (DetailedOutput, error) {
	if item == nil {
		return DetailedOutput{}, errors.New("nil item")
	}
	if s == nil || !s.Enabled() {
		return DetailedOutput{}, nil
	}

	in := SanitizeForAI(item)

	var out DetailedOutput
	out.Model = s.Model()
	var errs []error

	if s.summarizer != nil && s.summarizer.Enabled() {
		if ds, ok := s.summarizer.(DetailedSummarizer); ok {
			summary, usage, err := ds.SummarizeDetailed(ctx, in)
			if err != nil {
				errs = append(errs, err)
			} else {
				out.Summary = strings.TrimSpace(summary)
				out.Usage = addUsage(out.Usage, usage)
			}
		} else if summary, err := s.summarizer.Summarize(ctx, in); err != nil {
			errs = append(errs, err)
		} else {
			out.Summary = strings.TrimSpace(summary)
		}
	}

	if s.classifier != nil && s.classifier.Enabled() {
		if dc, ok := s.classifier.(DetailedClassifier); ok {
			tags, usage, err := dc.SuggestTagsDetailed(ctx, in)
			if err != nil {
				errs = append(errs, err)
			} else {
				out.Tags = uniqueTags(tags)
				out.Usage = addUsage(out.Usage, usage)
			}
		} else if tags, err := s.classifier.SuggestTags(ctx, in); err != nil {
			errs = append(errs, err)
		} else {
			out.Tags = uniqueTags(tags)
		}
	}

	return out, errors.Join(errs...)
}

// Model returns the concrete model string for cost lookup. Providers that
// track a model expose it via Modeler; the rest return "" (priced as $0).
func (s *Service) Model() string {
	if s == nil {
		return ""
	}
	if m, ok := s.summarizer.(Modeler); ok {
		return m.AIConfigModel()
	}
	if m, ok := s.classifier.(Modeler); ok {
		return m.AIConfigModel()
	}
	return ""
}

// Modeler is implemented by providers that know their model name.
type Modeler interface {
	AIConfigModel() string
}

func addUsage(total, inc *Usage) *Usage {
	if inc == nil {
		return total
	}
	if total == nil {
		total = &Usage{}
	}
	total.InputTokens += inc.InputTokens
	total.OutputTokens += inc.OutputTokens
	return total
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
