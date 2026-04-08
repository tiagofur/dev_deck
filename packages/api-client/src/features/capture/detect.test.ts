import { describe, it, expect } from 'vitest'
import { detectType, looksLikeURL, quickDetectFromClipboard } from './detect'
import type { ItemType } from './types'

// This matrix mirrors backend/internal/domain/items/detect_test.go so
// client-side previews match what the server will ultimately classify.
// If the backend diverges, we want CI to scream at us.
describe('detectType (9-rule matrix)', () => {
  const cases: Array<{
    name: string
    input: Parameters<typeof detectType>[0]
    want: ItemType
    title?: string
  }> = [
    {
      name: 'rule1_type_hint_wins',
      input: { url: 'https://github.com/foo/bar', type_hint: 'tool' },
      want: 'tool',
    },
    {
      name: 'rule2_github_repo',
      input: { url: 'https://github.com/charmbracelet/bubbletea' },
      want: 'repo',
      title: 'charmbracelet/bubbletea',
    },
    {
      name: 'rule2_github_non_repo_path',
      input: { url: 'https://github.com/settings/profile' },
      want: 'tool',
    },
    {
      name: 'rule3_plugin_vscode_marketplace',
      input: { url: 'https://marketplace.visualstudio.com/items?itemName=foo.bar' },
      want: 'plugin',
    },
    {
      name: 'rule3_plugin_jetbrains',
      input: { url: 'https://plugins.jetbrains.com/plugin/1234-my-plugin' },
      want: 'plugin',
    },
    {
      name: 'rule4_article_devto',
      input: { url: 'https://dev.to/foo/my-post' },
      want: 'article',
    },
    {
      name: 'rule4_article_medium_subdomain',
      input: { url: 'https://blog.medium.com/great-post' },
      want: 'article',
    },
    {
      name: 'rule5_cli_brew_install',
      input: { text: 'brew install ripgrep' },
      want: 'cli',
    },
    {
      name: 'rule5_cli_cargo_install',
      input: { text: 'cargo install ripgrep' },
      want: 'cli',
    },
    {
      name: 'rule5_cli_dollar_prompt',
      input: { text: '$ kubectl get pods' },
      want: 'cli',
    },
    {
      name: 'rule6_snippet_triple_backticks',
      input: { text: '```go\nfunc main() {}\n```' },
      want: 'snippet',
    },
    {
      name: 'rule6_snippet_indented',
      input: {
        text: `function hello() {
  console.log("hi");
  return 42;
}`,
      },
      want: 'snippet',
    },
    {
      name: 'rule7_shortcut_cmd_shift_p',
      input: { text: 'Cmd+Shift+P' },
      want: 'shortcut',
    },
    {
      name: 'rule7_shortcut_ctrl_alt_t',
      input: { text: 'Ctrl+Alt+T' },
      want: 'shortcut',
    },
    {
      name: 'rule8_tool_generic_url',
      input: { url: 'https://ripgrep.dev/' },
      want: 'tool',
    },
    {
      name: 'rule9_note_plain_text',
      input: { text: 'remember to update deps before friday' },
      want: 'note',
    },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const got = detectType(c.input)
      expect(got.type).toBe(c.want)
      if (c.title) expect(got.title).toBe(c.title)
    })
  }
})

describe('detectType edge cases', () => {
  it('title_hint is used as a fallback title', () => {
    const got = detectType({ url: 'https://example.com/x', title_hint: 'Custom title' })
    expect(got.type).toBe('tool')
  })

  it('empty input returns a note', () => {
    const got = detectType({})
    expect(got.type).toBe('note')
    expect(got.title).toBe('')
  })

  it('malformed URL falls back to note when no text', () => {
    const got = detectType({ url: 'not a url' })
    expect(got.type).toBe('note')
  })
})

describe('quickDetectFromClipboard', () => {
  it('classifies a URL pasted from clipboard', () => {
    const got = quickDetectFromClipboard('https://github.com/charmbracelet/bubbletea')
    expect(got.type).toBe('repo')
    expect(got.title).toBe('charmbracelet/bubbletea')
  })

  it('classifies a command pasted from clipboard', () => {
    const got = quickDetectFromClipboard('brew install ripgrep')
    expect(got.type).toBe('cli')
  })

  it('falls back to note for plain text', () => {
    const got = quickDetectFromClipboard('just a thought')
    expect(got.type).toBe('note')
  })

  it('returns note with empty title for empty input', () => {
    const got = quickDetectFromClipboard('   ')
    expect(got.type).toBe('note')
    expect(got.title).toBe('')
  })
})

describe('looksLikeURL', () => {
  it('accepts http and https', () => {
    expect(looksLikeURL('https://example.com')).toBe(true)
    expect(looksLikeURL('http://example.com/path')).toBe(true)
  })

  it('rejects bare hostnames', () => {
    expect(looksLikeURL('example.com')).toBe(false)
    expect(looksLikeURL('github.com/foo/bar')).toBe(false)
  })

  it('rejects non-URLs', () => {
    expect(looksLikeURL('')).toBe(false)
    expect(looksLikeURL('brew install ripgrep')).toBe(false)
  })
})
