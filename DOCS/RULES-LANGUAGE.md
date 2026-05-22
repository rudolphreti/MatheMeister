# Language Rules

## UI (user-facing)
- All UI text MUST be in German (prefer Austrian German).
- No gender suffixes/symbols (`:`, `*`, `_`).
- Avoid awkward phrasing; use natural Austrian alternatives.

## Code (developer-facing)
- Identifiers (files, variables, functions): English.
- Comments: English.
- User-visible errors: German.
- Developer logs: English is fine; avoid noisy spam.
- Branch names: English.

## Internationalization
- No hard-coded German strings inside business logic.
- Keep UI strings in a dedicated module and import them.
