---
tags:
  - devdeck
  - design
  - ux
  - patterns
status: active
date: 2026-04-29
---

# 🎨 DevDeck — UX Patterns & Design System

> Guía de patrones de UX consistentes entre web y desktop. Componentes, flujos, y decisiones de diseño.

---

## 🌈 Identidad visual

### Paleta de colores

**Basada en neo-brutalism + Snarkel (mascota)**

```css
/* Primary colors */
--color-primary:     #FF6B00;     /* Snarkel orange */
--color-primary-dark: #E55A00;
--color-secondary:   #0A7DFF;    /* DevDeck blue */
--color-accent:      #FF00FF;    /* Magenta (secundario) */

/* Neutrals */
--color-bg-light:    #FFFFFF;
--color-bg-dark:     #0F0F0F;
--color-surface:     #F5F5F5;     /* Light mode surface */
--color-surface-dark: #1A1A1A;    /* Dark mode surface */
--color-text:        #1A1A1A;
--color-text-light:  #FFFFFF;
--color-text-muted:  #666666;

/* Status colors */
--color-success:     #00CC88;
--color-warning:     #FFAA00;
--color-error:       #FF4444;
--color-info:        #00CCFF;
```

### Typography

```
Font stack: Inter (sans-serif) + MonoSpace (code)

Sizes:
- H1: 2.5rem (40px) — Page titles
- H2: 2rem (32px) — Section headers
- H3: 1.5rem (24px) — Subsection headers
- H4: 1.25rem (20px) — Card titles
- Body: 1rem (16px) — Main text
- Small: 0.875rem (14px) — Secondary text
- Tiny: 0.75rem (12px) — Metadata/hints

Weight: 400 (regular), 600 (semi-bold), 700 (bold)
```

---

## 🧩 Core components

### Modal (Capture + Dialogs)

**Usage**: Quick capture, confirmations, settings

```
Modal
├── Header (optional title + close button)
├── Body (content area)
├── Footer (CTA buttons)
└── Keyboard shortcuts
    ├── Escape = close
    ├── Enter = confirm (default action)
    └── Shift+Enter = alternate action
```

**Example: Capture modal**
```
┌────────────────────────────────────┐
│ Capture item          [x close]    │
├────────────────────────────────────┤
│ URL/Text (input)                   │
│ [Paste your link]                  │
│                                    │
│ Deck assignment (dropdown)         │
│ [Select Deck ▼]                    │
│                                    │
│ Tags (searchable input)            │
│ [cli] [go] [tools] [+Add]          │
│                                    │
│ Notes (optional textarea)          │
│ [Your personal notes...]           │
├────────────────────────────────────┤
│             [Cancel] [Add item]    │
└────────────────────────────────────┘

Keyboard: cmd+K to show, esc to close, enter to add
```

### Card (Item preview)

**Usage**: Item list, search results, related items

```
Card
├── Icon/Badge (type: repo, CLI, tip, etc)
├── Title (clickable)
├── Description (1-2 lines)
├── Metadata (stack, tags, date)
├── Actions (hover-reveal: favorite, share, delete)
└── Click → expand detail view
```

**Example: Card**
```
┌─────────────────────────────────────┐
│ [📦] cobra — CLI framework for Go   │
│                                     │
│ Go's best CLI toolkit with commands │
│ and subcommands. Perfect for...     │
│                                     │
│ Go | CLI | Recommended             │
│ ⭐ · 📤 · ⋮                          │
└─────────────────────────────────────┘
Hover → Actions appear on right (favorite, share, menu)
Click → Detail view full item
```

### List item (Compact)

**Usage**: Search results, recent items, commands

```
List Item
├── Icon (type)
├── Title + metadata (one line)
├── Quick action (right-aligned)
└── Keyboard navigation: ↑↓ arrow keys
```

**Example: Search result**
```
📦 cobra — Go CLI framework        ⭐ · 📤
🔍 goreleaser — Release automation  ⭐ · 📤
💾 viper — Config manager          ⭐ · 📤
```

### Tag component

**Style 1: Filled (auto-generated)**
```
[✨ cli] [✨ go] [✨ recommended]
```

**Style 2: Outline (manual)**
```
[personal] [favorite] [quick-ref]
```

**Interactive**:
- Hover → show description/category
- Click → filter by tag
- X on tag → remove (if editable)

### Search bar

```
┌──────────────────────────────────┐
│ 🔍 Search items...   [?] [+]     │
├──────────────────────────────────┤
│ Recent:                           │
│ • CLI tools                       │
│ • Go packages                     │
│ • Docker tips                     │
├──────────────────────────────────┤
│ Try:                              │
│ • "CLI for async tasks"           │
│ • "Docker performance"            │
│ • "Node best practices"           │
└──────────────────────────────────┘

Keyboard:
- cmd+K = focus search
- ↓ = next result
- ↑ = prev result
- Enter = select
- ? = help
```

### Sidebar (Navigation)

```
┌─────────────────────┐
│ DevDeck      [≡]    │ ← Header (logo + menu)
├─────────────────────┤
│ 📍 Your Decks       │
│ ▼ Go tools    (12)  │
│   ▼ CLI       (8)   │
│   ▼ Libs      (4)   │
│ ▼ DevOps      (25)  │
│ ▼ Frontend    (18)  │
│ ▼ AI/LLM      (30)  │
├─────────────────────┤
│ 🔖 All tags         │
│ 📌 Favorites (6)    │
│ 📤 Shared with me   │
│ 💬 Comments         │
├─────────────────────┤
│ ⚙️ Settings         │
│ 📚 Help             │
└─────────────────────┘

Click deck → shows items in main area
Right-click → context menu (rename, delete, duplicate, share)
```

### Detail view (Item full view)

```
┌────────────────────────────────────────────┐
│ ← Back | cobra — CLI framework | ⭐ · 📤    │
├────────────────────────────────────────────┤
│                                            │
│ [Repository image/preview]                │
│                                            │
│ Description (full markdown)                │
│ Cobra makes it easy to create...           │
│                                            │
│ Tags: [cli] [go] [recommended]             │
│ Type: Repository                           │
│ URL: https://github.com/spf13/cobra       │
│ Added: 2 weeks ago                         │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ Commands & Tips (Cheatsheet)         │  │
│ ├──────────────────────────────────────┤  │
│ │ cobra init <app>        Create app   │  │
│ │ cobra add <cmd>         Add command  │  │
│ │ cobra --version         Check ver    │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ Related items:                             │
│ • urfave/cli (Similar CLI framework)      │
│ • spf13/viper (Config by same author)     │
│                                            │
│ Comments (2):                              │
│ User1: "Great for Go CLIs!"                │
│ User2: "Use with viper for configs"        │
│                                            │
├────────────────────────────────────────────┤
│ [Edit] [Share] [Favorite] [Copy to deck]  │
└────────────────────────────────────────────┘
```

---

## 🔄 Common UX flows

### Capture flow

```
User: cmd+K (global hotkey or web)
  ↓
Modal: "Capture item"
  ↓
Paste URL/text
  ↓
DevDeck: Auto-extract metadata
  ↓
User: Select deck (or auto-suggest)
  ↓
User: Review tags (auto-generated + manual)
  ↓
User: Add notes (optional)
  ↓
Click "Add item"
  ↓
Notification: "✅ Added to [Deck]"
```

### Search flow

```
User: cmd+K (or click search bar)
  ↓
Type query: "CLI for parallel tasks"
  ↓
Results display (sorted by relevance)
  ↓
User: Select result (↑↓ arrows + enter)
  ↓
Detail view opens
  ↓
User: Copy command / favorite / share
```

### Share flow

```
User: On item detail view, click "Share"
  ↓
Share modal opens:
  ├─ Link (copy to clipboard)
  ├─ Expiration: 24h / 7d / 30d / never
  └─ Options: Comments allowed? Yes/No
  ↓
User: Send link to colleague
  ↓
Colleague: Opens link (no login needed)
  ↓
Colleague: Sees item + comments
  ↓
Colleague: "Copy to my deck" (optional)
```

---

## 🚀 Interaction patterns

### Keyboard-first design

```
Global shortcuts:
cmd+K       Search / Capture
cmd+N       New item
cmd+L       Focus search
cmd+P       Command palette (future)
cmd+,       Settings
cmd+H       Help/Shortcuts
cmd+Shift+S Screenshot capture (desktop)

In modals:
Escape      Close
Enter       Confirm default action
Shift+Enter Alternate action
Tab         Next field
Shift+Tab   Prev field

In lists:
↑↓          Navigate
Enter       Select
Delete      Remove item
D           Toggle favorite
C           Copy to deck
```

### Hover states

All interactive elements have clear hover state:
```
Button: background color changes
Link: underline appears
Card: slight shadow/elevation
Tag: opacity change or background
```

### Loading states

```
Button: Show spinner
"Loading..."

Search results: Skeleton loading (placeholder cards)

Sync indicator: Spinning icon in corner
"Syncing..." (temporary)
```

### Empty states

```
When no items in deck:
┌────────────────────────────┐
│   📦 Empty deck            │
│                            │
│  No items yet. Start by:   │
│  1. cmd+K to capture      │
│  2. Paste a URL            │
│  3. Select this deck      │
│                            │
│  [Go to featured items →] │
└────────────────────────────┘
```

---

## 📱 Responsive design

### Breakpoints

```
Mobile:      < 640px
Tablet:      640px - 1024px
Desktop:     > 1024px

Layout strategy: Sidebar collapses on mobile
Mobile sidebar: Bottom tab bar or hamburger menu
```

### Mobile optimizations

```
Search bar: Full width, easy to tap
Cards: Taller (more tap area)
Modal: Full screen (easier on small screen)
Detail view: Stacked layout (no columns)
Commands: Larger font + more padding
```

---

## 🎯 Accessibility

### Color contrast
- Text: >= 4.5:1 ratio (WCAG AA)
- Interactive elements: >= 3:1 ratio

### Focus indicators
- Clear focus ring (2px outline)
- Not removed for keyboard users
- Visible on dark and light themes

### Alternative text
- Images: Descriptive alt text
- Icons: aria-label or title
- Buttons: Clear, descriptive text

### Keyboard navigation
- All interactive elements: Keyboard accessible
- Tab order: Logical and predictable
- Focus trap: Modals trap focus

---

## 🎬 Animations

**Philosophy**: Fast, subtle, purposeful. No gratuitous animations.

### Transitions
```
Hover effects:         150ms ease-out
Modal open/close:      200ms ease-out
Page transitions:      300ms ease-out
Loading spinner:       Infinite 1s rotation
```

### Example
```
Button hover:
  - Background: #FF6B00 → #E55A00 (150ms)
  - Scale: 1 → 1.02 (optional, subtle)

Card on hover:
  - Shadow: light → medium (150ms)
  - Y position: 0 → -2px (optional)
```

---

## 🌙 Dark mode

**Strategy**: System preference + manual toggle

```
Default: System preference (prefers-color-scheme)
Override: Settings → Theme → Auto / Light / Dark

In dark mode:
- Background: #0F0F0F
- Surface: #1A1A1A
- Text: #FFFFFF
- Accent: Slightly lighter (maintain contrast)
```

---

## 🔗 Shared components (Web + Desktop)

These React components are shared between web and desktop:
```
components/
├── Card.tsx
├── Modal.tsx
├── SearchBar.tsx
├── TagInput.tsx
├── ItemDetail.tsx
├── Sidebar.tsx
├── Button.tsx
├── Input.tsx
└── ...
```

**Principle**: Single source of truth for UI.

Desktop Tauri app imports React components directly from web app.

---

## 📐 Design guidelines for new features

When adding new features:

1. **Use existing components** (Card, Modal, Button)
2. **Maintain keyboard-first** — Every interaction should work with keyboard
3. **Test accessibility** — Screen reader, keyboard nav, color contrast
4. **Mobile first** — Design mobile, then add desktop enhancements
5. **Performance** — Animations < 300ms, no jank
6. **Dark mode** — Test both themes

---

## 🚀 Component storybook (future)

Goal: Build Storybook to showcase all components and patterns.

```bash
npm run storybook
# Opens http://localhost:6006
# Shows Card, Modal, Button, etc. in all states
```

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Referencia para implementación
