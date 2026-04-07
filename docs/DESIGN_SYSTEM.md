# RepoVault — Design System

> **Estilo:** Neo-Brutalist Colorido
> Versión: 0.1 · Última actualización: 2026-04-07

---

## 1. Filosofía visual

Neo-brutalismo con alma. **Bordes gruesos, sombras hard, colores que gritan, tipografía que no pide permiso.** Cada elemento se siente como un sticker pegado en un cuaderno — tangible, divertido, memorable.

**Reglas no negociables:**

1. **Borde negro 3px sólido** en todo lo interactivo
2. **Sombra hard** `4px 4px 0 0 #0A0A0A` — sin blur, jamás
3. **Cero gradientes**, cero sombras suaves
4. **Border-radius 0** (o máximo 6px en casos puntuales)
5. **Colores planos vivos** — nada de pasteles desaturados
6. **Tipografía protagonista** — pesos 700+, tamaños grandes, sin miedo
7. **Microinteracciones físicas** — hover lifts, click hunde, rotaciones leves

---

## 2. Tokens

### 2.1 Color

```css
:root {
  /* Backgrounds */
  --bg-primary:  #FFFBF0;  /* crema papel — fondo de la app */
  --bg-card:     #FFFFFF;  /* cards */
  --bg-elevated: #F4F0E0;  /* secciones secundarias */

  /* Ink (todo lo "negro" del UI) */
  --ink:         #0A0A0A;  /* bordes, texto principal, sombras */
  --ink-soft:    #4A4A4A;  /* texto secundario */

  /* Accents — colores planos vivos */
  --accent-pink:     #FF5C8A;  /* primario — botones principales */
  --accent-yellow:   #FFD23F;  /* highlights, mascota, hover */
  --accent-cyan:     #4DD0E1;  /* info, links */
  --accent-lime:     #7CFF6B;  /* success, "agregado", verde discreto */
  --accent-lavender: #B388FF;  /* discovery mode */
  --accent-orange:   #FF8A3D;  /* warning, fork, contador */

  /* Status */
  --danger:  #FF3B30;
  --success: #00C853;

  /* Shadows hard */
  --shadow-sm: 2px 2px 0 0 var(--ink);
  --shadow-md: 4px 4px 0 0 var(--ink);
  --shadow-lg: 6px 6px 0 0 var(--ink);
  --shadow-xl: 8px 8px 0 0 var(--ink);
}
```

### 2.2 Tipografía

```css
:root {
  --font-display: 'Space Grotesk', 'Archivo Black', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Cascadia Code', monospace;
}
```

**Escala:**

| Token | Tamaño | Peso | Uso |
|-------|--------|------|-----|
| `text-xs`  | 12px | 600 | Metadata, chips |
| `text-sm`  | 14px | 500 | Secondary copy |
| `text-base`| 16px | 500 | Body |
| `text-lg`  | 18px | 600 | Subtítulos card |
| `text-xl`  | 22px | 700 | Títulos card |
| `text-2xl` | 28px | 800 | Headings sección |
| `text-3xl` | 36px | 800 | Page titles |
| `text-display` | 56px | 900 | Hero / empty states |

### 2.3 Spacing

Escala base 4px: `0, 4, 8, 12, 16, 24, 32, 48, 64, 96`.

### 2.4 Borders & Radii

```css
--border-thin:   2px solid var(--ink);
--border:        3px solid var(--ink);   /* default */
--border-thick:  5px solid var(--ink);   /* énfasis */

--radius-none: 0;
--radius-sm:   4px;   /* solo donde sea visualmente necesario */
--radius-md:   6px;   /* máximo */
```

### 2.5 Motion

```css
--ease-snap: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-pop:  cubic-bezier(0.34, 1.56, 0.64, 1);

--dur-fast:   120ms;
--dur-base:   200ms;
--dur-slow:   400ms;
```

**Reglas:**
- Hover: lift `translate(-2px,-2px)` + sombra crece a `--shadow-lg`
- Active/click: hunde `translate(2px,2px)` + sombra colapsa a `--shadow-sm`
- Cards al entrar: rotación leve random entre `-1deg` y `+1deg`

---

## 3. Componentes

### 3.1 `<Button>`

```
┌────────────────────┐
│   AGREGAR REPO  +  │   ← bg pink, ink text, border 3px, shadow-md
└────────────────────┘
                  ▓▓▓
                  ▓▓▓
```

```css
.btn {
  background: var(--accent-pink);
  color: var(--ink);
  border: var(--border);
  box-shadow: var(--shadow-md);
  padding: 12px 20px;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-snap);
}
.btn:hover  { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
.btn:active { transform: translate(2px,2px);   box-shadow: var(--shadow-sm); }
```

**Variantes:** `primary` (pink), `secondary` (white), `accent` (yellow), `danger` (red), `ghost` (transparente con borde).

### 3.2 `<RepoCard>`

```
┌──────────────────────────────────────┐
│  ┌──┐  charmbracelet/bubbletea       │
│  │👤│  A powerful little TUI         │
│  └──┘  framework                     │
│                                       │
│  ●Go    ★ 28.4k    🍴 812            │
│                                       │
│  ┌────┐ ┌────┐ ┌──────┐               │
│  │ cli│ │ go │ │ tui  │               │
│  └────┘ └────┘ └──────┘               │
└──────────────────────────────────────┘
              ▓▓▓
              ▓▓▓
```

- Background `--bg-card`, border 3px ink, shadow-md
- Avatar 48px, border 2px
- Título `text-xl` `--font-display`
- Lenguaje con dot color del lang (palette de GitHub)
- Tags como `<TagChip>` color rotativo
- Hover: lift + rota ±1deg random

### 3.3 `<TagChip>`

Pills cuadradas, border 2px, sombra `--shadow-sm`, color de fondo rotativo entre los accents.

### 3.4 `<AddRepoModal>`

```
┌──────────────────────────────────────┐
│  PEGÁ EL LINK ↓                  ✕   │
│  ┌────────────────────────────────┐  │
│  │ https://github.com/...         │  │
│  └────────────────────────────────┘  │
│                                       │
│  [Preview live aparece acá]          │
│                                       │
│            ┌──────────┐               │
│            │ GUARDAR  │               │
│            └──────────┘               │
└──────────────────────────────────────┘
```

Modal centrado, backdrop yellow translúcido, border 5px ink, shadow-xl.

### 3.5 `<Mascot>`

- SVG/Lottie 120×120 fixed bottom-right
- Estados:
  - **idle** — respira suave (scale 1 ↔ 1.02 cada 3s)
  - **happy** — saltito + ojitos cerrados (al agregar repo)
  - **sleeping** — Z's flotando (sin actividad 7d)
  - **judging** — ceja levantada (lang dominante > 70%)
  - **celebrating** — confetti pixelado (milestones)
- Click → diálogo en speech bubble neo-brutalist (border 3px, fondo yellow)

### 3.6 `<DiscoveryDeck>` (modo descubrimiento)

- Fondo `--accent-lavender` fullscreen
- Card central grande (80% viewport), shadow-xl, ligera rotación
- Drag horizontal/vertical con Framer Motion
- Indicadores de swipe a los 4 lados con iconos grandes
- Esc o swipe-down → salir

### 3.7 `<Toast>`

Esquina inferior izq, bg lime/yellow/red según tipo, border 3px, shadow-md, dura 2.5s, slide-in desde abajo con bounce (`--ease-pop`).

### 3.8 `<EmptyState>`

Mascota grande centrada + texto display + botón primario. Ejemplo:

```
        🦎
   TODAVÍA NO HAY
   NADA POR ACÁ

  ┌──────────────────┐
  │  AGREGAR PRIMERO │
  └──────────────────┘
```

---

## 4. Layout

```
┌─────────────────────────────────────────────┐
│  REPOVAULT           🔍 Buscar     [+ ADD]  │  ← Topbar, border-bottom 3px
├─────────────┬───────────────────────────────┤
│             │                               │
│  TAGS       │   ┌────┐ ┌────┐ ┌────┐         │
│  ▸ cli      │   │card│ │card│ │card│         │
│  ▸ frontend │   └────┘ └────┘ └────┘         │
│  ▸ go       │                               │
│  ▸ learning │   ┌────┐ ┌────┐ ┌────┐         │
│             │   │card│ │card│ │card│         │
│  LANGS      │   └────┘ └────┘ └────┘         │
│  ● Go       │                               │
│  ● TS       │                          🦎    │
│  ● Rust     │                                │
└─────────────┴───────────────────────────────┘
```

- Sidebar 240px, border-right 3px
- Grid responsive 1/2/3/4 cols según ancho
- Mascota fixed bottom-right del content area

---

## 5. Iconografía

**Lucide React** — line style, stroke-width 2.5px (más grueso de lo default para combinar con el resto). Todos los iconos van color `--ink`.

---

## 6. Accesibilidad

- Contraste mínimo AA en todo texto
- Focus visible: outline 3px `--accent-cyan` + offset 2px
- Atajos de teclado documentados en `?` modal
- `prefers-reduced-motion` → desactiva rotaciones, mantiene transiciones

---

## 7. Don'ts

❌ Sombras con blur
❌ Gradientes
❌ Border-radius > 6px
❌ Texto gris claro sobre fondo claro
❌ Iconos rellenos (siempre line)
❌ Animaciones fade-only (siempre transform o color cambia algo físico)
❌ Tipografía thin/light (mínimo 500)
