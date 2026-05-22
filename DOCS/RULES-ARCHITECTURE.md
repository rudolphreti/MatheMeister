# Architecture & Modularity

- One module = one responsibility.
- Business logic must not touch the DOM.
- UI rendering must not contain business rules.
- Storage access must be isolated behind dedicated functions/modules.

Suggested layering:
1. `domain` / business logic
2. `ui` / rendering + events
3. `storage` / persistence adapter
4. `i18n` / UI strings
