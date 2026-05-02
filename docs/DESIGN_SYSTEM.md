# DevDeck.ai Design System

DevDeck follows a **Neo-brutalist / High-Contrast** aesthetic. It's designed to be clean, professional, and distinct from the generic "SaaS SaaS" look.

[Leer en español](DESIGN_SYSTEM.es.md)

---

## 1. Visual Identity
- **Bold Borders:** All cards and buttons have a `2px` solid black border.
- **Deep Shadows:** `box-shadow: 4px 4px 0px 0px #000;` (non-blurred).
- **Vibrant Accents:** High-saturation colors used sparingly.
- **Typography:** Inter for readability, JetBrains Mono for code.

---

## 2. Color Palette

### 2.1 Base Colors
- **Background:** `#121212` (Dark Mode) / `#FFFFFF` (Light Mode).
- **Surface:** `#1E1E1E` / `#F3F3F3`.
- **Text Primary:** `#FFFFFF` / `#000000`.
- **Border:** `#000000` / `#000000`.

### 2.2 Brand Colors
- **Primary:** `#6366F1` (Indigo).
- **Success:** `#22C55E` (Green).
- **Warning:** `#F59E0B` (Amber).
- **Danger:** `#EF4444` (Red).

---

## 3. Core Components

### 3.1 Button
```css
.btn {
  border: 2px solid #000;
  box-shadow: 4px 4px 0px 0px #000;
  padding: 0.5rem 1rem;
  transition: all 0.1s ease;
}
.btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px #000;
}
```

### 3.2 Card
Used for Items and Cheatsheets.
- **Border:** 2px solid black.
- **Shadow:** 4px 4px black.
- **Padding:** 1rem.

---

## 4. Layout
- **Sidebar:** Navigation and Filters.
- **Main Area:** Grid or List view of items.
- **Right Panel:** Item details and AI summary.

---

## 5. Icons
We use **Lucide React** for consistent iconography. Use `strokeWidth={2}` to match the bold border aesthetic.
