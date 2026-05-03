# Specification: English Docs & Support Integration

**ID**: `english-docs-and-support`
**Status**: `SPECIFIED`

## 1. File Migration (Spanish Preservation)
Existing Spanish documentation files MUST be renamed to include a `.es.md` suffix BEFORE creating the English versions.

### 1.1 Root Files Migration
| Current | Target |
|---------|--------|
| `README.md` | `README.es.md` |
| `CONTRIBUTING.md` | `CONTRIBUTING.es.md` |
| `ROADMAP.md` | `ROADMAP.es.md` |
| `SECURITY.md` | `SECURITY.es.md` |

### 1.2 Documentation Folder Migration
All `.md` files within `docs/` (including subdirectories like `docs/adr/`) MUST follow the same pattern: `filename.md` -> `filename.es.md`.

## 2. English Documentation Requirements
New English versions of the files must be created at the original filenames.

### 2.1 Content Quality
- Translations must be accurate but maintain the project's "Senior Architect" vibe (passionate, direct, technically precise).
- Use proper technical terminology (e.g., "monorepo", "off-line first", "vector search").

### 2.2 Cross-Linking
- Each English file SHOULD contain a link at the top or bottom to its Spanish counterpart: `[Leer en español](README.es.md)`.
- Internal links between documents must be updated to point to the `.md` (English) version.

## 3. Support Mechanism (Buy Me a Coffee)
The root `README.md` and `docs/README.md` (if it exists) MUST include a visible support badge.

### 3.1 Badge Specification
- **Service**: Buy Me a Coffee
- **URL**: `https://www.buymeacoffee.com/tiagofur`
- **Badge Style**: Shields.io "for-the-badge"
- **Markdown Snippet**:
  ```markdown
  [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/tiagofur)
  ```

## 4. Verification Criteria
- [ ] All original filenames exist as English content.
- [ ] All `.es.md` versions exist and contain the original Spanish content.
- [ ] Root `README.md` shows the Buy Me a Coffee badge correctly.
- [ ] No broken internal links in the new English documentation.
