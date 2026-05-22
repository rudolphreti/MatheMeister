# Data, JSON & Browser Storage

- Persist only JSON-serializable data.
- Validate user input before storing.
- Validate loaded storage data before use.
- Keep versioned storage schema when shape changes (e.g. `version` field).

Storage defaults:
- Browser storage only (`localStorage` by default).
- No backend/database assumptions in prototype mode.
