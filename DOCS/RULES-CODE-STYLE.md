# Code Style

- Keep diffs small and reviewable.
- Prefer readable code over clever code.
- Use English naming and comments.

PR checklist:
- No business logic in UI render layer.
- No hard-coded UI strings in business logic.
- CUD behavior is smooth (no jump/flicker/refresh).
- Storage read/write path validates data.
