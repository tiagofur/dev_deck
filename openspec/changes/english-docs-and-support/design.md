# Technical Design: English Docs & Support Integration

**ID**: `english-docs-and-support`
**Status**: `DESIGNED`

## Architectural Approach
We are not just translating; we are re-platforming the documentation to be English-first while maintaining a legacy Spanish layer.

## Component Breakdown

### 1. Renaming Script (Bash)
To ensure no file is missed, I will use a simple bash loop to rename files in `docs/`.
```bash
find docs -name "*.md" ! -name "*.es.md" -exec bash -c 'mv "$1" "${1%.md}.es.md"' _ {} \;
```

### 2. Translation Mapping
The translation will be handled batch by batch:
1. **Root Criticals**: `README.md`, `CONTRIBUTING.md`.
2. **Docs Index**: `docs/README.md` (if exists) or create a new one to guide international contributors.
3. **Core Documentation**: `ARCHITECTURE.md`, `VISION.md`, `PRD.md`.
4. **ADRs**: Translating the decision records.

### 3. README Layout Design
The new English `README.md` will follow this structure:
1. Header with Name and Slogan.
2. **Support Section** (Buy Me a Coffee Badge).
3. Language Toggle (link to `README.es.md`).
4. Value Proposition.
5. Tech Stack (with icons if possible).
6. Repo Structure map.
7. Documentation Table (linking to new English files).
8. Roadmap & Status.

## Implementation Details
- **Badge URL**: `https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black`
- **Link Target**: `https://www.buymeacoffee.com/tiagofur`

## Trade-offs
- **One-way sync**: New changes to English docs won't automatically be reflected in Spanish ones. We will document this in `CONTRIBUTING.es.md` to warn Spanish contributors that English is now the "source of truth".
