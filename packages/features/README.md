# @devdeck/features

The heart of DevDeck. This package contains **100% of the business logic, pages, and domain-specific components** shared between the Web and Desktop applications.

## Why this package?

To ensure total parity between the web and desktop experiences. By centralizing features here, we avoid duplicating code and logic. The only difference between the apps is the "shell" (routing strategy, electron-specific integrations, etc.).

## Structure

```
src/
  auth/           # Login pages, OAuth callbacks, Profile
  cheatsheets/    # Cheatsheet listing, detail, and editing
  repos/          # Repository management and discovery
  capture/        # Capture flow (Paste, URL entry)
  layout/         # Shared Shell, Sidebar, and Navigation
  common/         # Shared domain components and hooks
```

## Usage

Import components and hooks directly into your app:

```tsx
import { CheatsheetDetail } from '@devdeck/features/cheatsheets';
```

---

*Part of the DevDeck Monorepo*
