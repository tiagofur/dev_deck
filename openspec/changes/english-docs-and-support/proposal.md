# Change Proposal: English Docs & Support Integration

**ID**: `english-docs-and-support`
**Status**: `PROPOSED`
**Author**: Antigravity

## Intent
Globalize the **DevDeck.ai** repository to attract international contributors and users. This involves making English the primary language for all public documentation and providing a way for the community to support the project financially.

## User Review Required
> [!IMPORTANT]
> **Language Strategy**: I propose making English the default for all main documentation files (e.g., `README.md`). 
> **Preserving Spanish**: To avoid losing the current excellent content, I propose renaming current files to `FILENAME.es.md` (e.g., `README.es.md`) before replacing the main ones with English versions. 

## Proposed Changes

### Documentation Globalizing
- **Root Files**: Translate `README.md`, `CONTRIBUTING.md`, `ROADMAP.md`, and `SECURITY.md`.
- **Docs Folder**: Translate all files in `docs/` and `docs/adr/`.
- **Filenames**: 
    - `README.md` (ES) -> `README.es.md`
    - `README.md` (EN) -> [NEW] `README.md`
    - (Same pattern for all translated files).

### Support Integration
- **Badge**: Add a "Buy Me a Coffee" badge to the top of `README.md` and `docs/README.md`.
- **Link**: Use `https://www.buymeacoffee.com/tiagofur`.

## Approach
1. **Renaming**: Batch rename existing Spanish files to include the `.es.md` suffix.
2. **Translation**: Progressively translate each file, ensuring technical terms remain consistent and the "Senior Architect" tone is preserved in the English version.
3. **Link Verification**: Ensure all internal documentation links are updated to point to the new English versions (or kept relative if they match).
4. **Badge Injection**: Use the Shields.io standard for the support badge.

## Risks & Mitigations
- **Broken Links**: Moving files to `.es.md` might break external links if they were pointing to specific files. 
    - *Mitigation*: We will keep the English version at the original filename to minimize disruption for the majority of new users.
- **Translation Quality**: Ensuring the "vibe" of the project isn't lost in translation.
    - *Mitigation*: I will maintain the same passionate and direct tone in English.

---
**¿Qué decís, hermano? ¿Te cierra este plan de ataque para los archivos y el link de Tiago?**
