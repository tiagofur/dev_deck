# AI Summarization Specification

## Purpose
Describe the behavior of AI-driven summarization, specifically the truncation of text to fit UI and storage constraints.

## Requirements

### Requirement: UTF-8 Safe Truncation
The system MUST truncate text to a maximum length (default 160 characters) without corrupting multi-byte UTF-8 characters.

#### Scenario: Truncate ASCII string
- GIVEN a string of 200 ASCII characters
- WHEN truncated to 160 characters
- THEN the result MUST be exactly 159 characters followed by an ellipsis "…"
- AND the total length MUST NOT exceed 160 characters.

#### Scenario: Truncate multi-byte UTF-8 string
- GIVEN a string where the 160th byte is in the middle of a multi-byte character (e.g., an emoji)
- WHEN truncated to 160 characters
- THEN the system MUST slice the string at a character boundary
- AND the resulting string MUST be valid UTF-8.
