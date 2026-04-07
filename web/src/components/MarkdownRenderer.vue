<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
  repoUrl?: string   // optional: used to resolve relative image URLs
}>()

// Derive GitHub raw-content base from the repo HTML URL.
// https://github.com/owner/repo  →  https://raw.githubusercontent.com/owner/repo/HEAD/
function getRawBase(repoUrl?: string): string {
  if (!repoUrl) return ''
  const m = repoUrl.match(/github\.com\/([^/?#]+\/[^/?#]+)/)
  return m ? `https://raw.githubusercontent.com/${m[1]}/HEAD/` : ''
}

// Resolve a potentially-relative URL against an absolute base.
function resolveUrl(base: string, url: string): string {
  if (!url || !base) return url
  if (/^https?:\/\//i.test(url) || url.startsWith('//') || url.startsWith('data:')) return url
  try { return new URL(url, base).href } catch { return url }
}

// Configure marked once at module scope.
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      const highlighted = hljs.highlight(text, { language }).value
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
    },
  },
})

const html = computed(() => {
  const rawBase = getRawBase(props.repoUrl)

  let raw = marked.parse(props.content) as string

  // Post-process: rewrite relative image src attributes to absolute raw GitHub URLs.
  if (rawBase) {
    raw = raw.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/gi, (_, pre, src, post) =>
      pre + resolveUrl(rawBase, src) + post
    )
  }

  // Add loading="lazy" to all images and open links in new tab.
  raw = raw
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"')
    .replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer"')

  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['img'],
    ADD_ATTR: ['src', 'alt', 'title', 'width', 'height', 'loading', 'target', 'rel'],
  })
})
</script>

<template>
  <div class="markdown" v-html="html" />
</template>
