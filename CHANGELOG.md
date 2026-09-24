# Changelog

The skill follows semantic versioning. A major version changes a rule an agent would follow differently; a minor version adds guidance; a patch fixes wording, links or examples. The version and the "last checked" date live at the bottom of `skills/vue-enterprise/SKILL.md`.

## 1.0.1 — 2026-09-24

Security and privacy fixes.

- Security reviews send requests, scans and proof-of-concept payloads only to environments the user authorizes, and reports cite a secret's file and line, never its value (security-review ground rule 9).
- HTTP Observatory scans only hosts the user names and is authorized to test.
- Semgrep runs with `--metrics=off`: it otherwise sends usage metrics whenever it pulls registry rules.
- README: removed the third-party installer; install with `git clone` only.

## 1.0.0 — 2026-09-24

First public release.

- **Skill:** conventions for Vue 3 + TypeScript apps, Nuxt included, with 22 reference files: architecture and monorepos, components and the design system, reactivity, composables, VueUse, client state, server data (Pinia Colada), TypeScript, errors, forms, routing, testing (Vitest, Vue Test Utils, Playwright), performance, security and security review, supply chain, accessibility (WCAG 2.2 AA), i18n, feature flags, migration, tooling and Nuxt.
- **Which rule wins:** security and "Done means" first, then the project's instructions, then its established conventions, then this skill. Legacy patterns are never conventions to copy. Teams add overrides under "Vue overrides" in `AGENTS.md`.
- **Always-on rules:** `assets/vue.instructions.md` for `.github/instructions/`, loaded by Copilot for `.vue`/`.ts` files and by Claude Code through an `@` import.
- **Tools:** works in Claude Code and GitHub Copilot (VS Code agent mode, Copilot CLI, cloud agent); frontmatter limited to `name` and `description`.
- **Verification:** every rule checked against the official docs as of 2026-09-24. `checks/` compiles, lints (with the skill's own settings) and runs 15 of the skill's code examples in CI, and fails when an example drifts. `evals/prompts.md` holds manual agent evals per tool.
- MIT license.
