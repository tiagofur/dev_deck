# Testing Strategy & CI

This document outlines how we ensure the quality and stability of **DevDeck.ai**.

[Leer en español](TESTING_STRATEGY.es.md)

---

## 1. Core Principles
- **Reliability:** The capture and search flows must never break.
- **Speed:** Tests must run quickly in CI.
- **Coverage:** Focus on high-value paths (Integration and E2E) rather than 100% unit coverage.

---

## 2. Backend (Go)

### 2.1 Unit Tests
- Location: `internal/**/*_test.go`.
- Focus: Business logic, transformers, and validation.
- Command: `go test -v ./internal/...`

### 2.2 Integration Tests
- Tool: `testcontainers-go`.
- Focus: Database queries (Postgres/pgvector) and external API interactions.
- Command: `go test -tags=integration ./...`

---

## 3. Frontend (React)

### 3.1 Component Tests
- Tool: **Vitest** + **React Testing Library**.
- Location: `packages/ui/**/*.test.tsx` and `packages/features/**/*.test.tsx`.
- Command: `pnpm test:ui`

### 3.2 End-to-End (E2E)
- Tool: **Playwright**.
- Focus: Critical flows across the entire stack.
    - Login via GitHub (Mocked).
    - Capture URL -> Verify item appears in list.
    - Search for item -> Verify correct result.
- Command: `pnpm test:e2e`

---

## 4. Continuous Integration (CI)
We use **GitHub Actions** for every PR and push to `main`.

### Pipeline:
1. **Linting:** `golangci-lint` for Go, `eslint` for TypeScript.
2. **Type Check:** `tsc` for frontend.
3. **Tests:** Run all unit and integration tests.
4. **Build Check:** Ensure `pnpm build` completes for all packages.

---

## 5. Manual Verification
Before any major release:
1. Deploy to **Staging** environment.
2. Verify Desktop app build on macOS (native shell behavior).
3. Smoke test capture via CLI and Extension.
