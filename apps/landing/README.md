# @heapdeck/landing

Marketing landing page for HeapDeck (Astro + shared neo-brutalist design tokens). English at `/`, Spanish at `/es`.

**Status:** built in CI (`pnpm -F @heapdeck/landing build`) but not deployed yet — production traffic goes straight to the web app at [heapdeck.com](https://heapdeck.com). The landing stays as the future marketing front door; keep its CTAs pointing at the live beta (`https://heapdeck.com/register`) until a deploy target is wired.

## Commands

| Command          | Action                                  |
| :--------------- | :-------------------------------------- |
| `pnpm dev`       | Local dev server at `localhost:4321`    |
| `pnpm build`     | Production build to `./dist/`           |
| `pnpm preview`   | Preview the production build locally    |
