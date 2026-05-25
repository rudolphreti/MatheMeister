# AI Workflow Rules

These rules define how an AI agent must work in this repository.

## Required workflow

1. **Paraphrase before coding**  
   Before generating code, the agent must explain in its own words what it understood and what it is going to do.

2. **Read `DOCS/` rules first**  
   Every task starts with checking the current rules in the `DOCS` directory.

3. **Work in TDD cycle**  
   Implementation changes should follow: test -> implementation -> refactor.

4. **Automation and dev server policy**  
   Run `npm run dev` only after tests are green.

## Minimal checklist before finishing

- [ ] The agent provided a task paraphrase before coding.
- [ ] Rules from `DOCS/` were read.
- [ ] Tests passed.
- [ ] `npm run dev` was started only after tests (if needed).
