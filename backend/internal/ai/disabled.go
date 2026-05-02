package ai

import "context"

type disabledProvider struct{}

func (disabledProvider) Enabled() bool { return false }

func (disabledProvider) SuggestTags(context.Context, Input) ([]string, error) {
	return nil, nil
}

func (disabledProvider) Summarize(context.Context, Input) (string, error) {
	return "", nil
}
