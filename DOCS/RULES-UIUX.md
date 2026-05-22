# UI/UX Rules

- Use UI/UX library utilities first.
- Mobile first.
- Avoid custom CSS unless necessary.
- Prefer inline panels over modals.
- Keep UI minimal and readable; avoid decorative shadows unless they convey state.

## CUD behavior (Create / Update / Delete)
CUD operations MUST NOT:
- scroll the page to the top,
- trigger full re-renders,
- refresh the page,
- cause visual flicker or layout jumps.

CUD should be handled via smooth local state updates and targeted DOM changes only.

Never re-render or replace focused inputs while the user types; preserve focus to avoid hiding the mobile keyboard.
