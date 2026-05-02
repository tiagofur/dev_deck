# Product Requirements Document (PRD)

**Project:** DevDeck.ai
**Version:** 1.0 (Wave 4.5)
**Status:** Active

[Leer en español](PRD.es.md)

---

## 1. Executive Summary
DevDeck is a platform for developers to capture, organize, and rediscover technical knowledge (repos, CLIs, snippets) using AI to minimize manual effort and maximize searchability.

---

## 2. Target Audience
- Developers looking for better ways to manage their "tooling debt."
- Teams wanting to share a curated stack of tools and best practices.

---

## 3. User Stories

### 3.1 Capture
- **US1:** As a user, I want to save a URL and have the system automatically fetch the title, description, and an image (Open Graph).
- **US2:** As a user, I want to save a CLI command and its installation steps.
- **US3:** As a user, I want to capture a snippet of code or a markdown note quickly.
- **US4:** As a user, I want a global shortcut in the desktop app to save the current clipboard content.

### 3.2 Discovery & Search
- **US5:** As a user, I want to search my vault using natural language (semantic search).
- **US6:** As a user, I want to filter my items by type (Repo, CLI, Snippet, etc.).
- **US7:** As a user, I want to see "similar items" to what I'm currently viewing.

### 3.3 Organization
- **US8:** As a user, I want the AI to suggest tags and categories for new items.
- **US9:** As a user, I want to create "Decks" (curated collections) to group related items.

---

## 4. Key Features

### 4.1 Capture Channels
- **Web App:** Manual input.
- **Desktop App:** Paste detection + global shortcut.
- **CLI:** `devdeck add <url>`.
- **Browser Extension:** One-click save.

### 4.2 Intelligence (AI)
- **Automatic Enrichment:** Scrape content and summarize it.
- **Vector Search:** pgvector integration for intent-based search.
- **Smart Tagging:** Automated categorization based on content analysis.

### 4.3 Multi-Platform
- **Web:** Full access from any browser.
- **Desktop:** Offline-first experience (Electron).
- **Mobile:** Read-only / Quick capture view (Roadmap).

---

## 5. Non-Functional Requirements
- **Performance:** Instant search results (< 100ms).
- **Privacy:** Data is stored in a private database; local storage for the desktop app.
- **Offline:** Core functionality (search/view) must work without internet in the desktop app.

---

## 6. Success Metrics
- **Retention:** Number of users who save at least 5 items per week.
- **Efficiency:** Time saved in finding a previously saved tool compared to traditional search.
- **Growth:** Number of public Decks shared by the community.
