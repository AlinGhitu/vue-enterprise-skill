# Changelog

The skill follows semantic versioning. A major version changes a rule an agent would follow differently; a minor version adds guidance; a patch fixes wording, links or examples. The version and the "last checked" date live at the bottom of `skills/vue-enterprise/SKILL.md`.

## 1.1.0 — 2026-09-30

New review and performance guidance, layout-specific always-on rules, and a smaller skill to load. Includes the token reductions prepared as 1.0.2, which was never released.

**Guidance**

- **Security review:** findings map to OWASP ASVS 5.0.0 as well as the Top 10. Checklist headings name the ASVS sections, items that match one requirement carry its ID (`v5.0.0-3.5.5`), and agents cite a requirement ID only after reading it in the ASVS text.
- **Performance:** Core Web Vitals targets at p75 (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1); optimizations show the metric they move.
- **Supply chain:** build provenance attestations and the SLSA Build Level they reach; `gh attestation verify` on the consuming side.

**Always-on rules and compatibility**

- **Always-on rules:** `assets/variants/` ships Vite, Nuxt 4 and monorepo copies of `vue.instructions.md` with a narrower `applyTo`, for repositories that also hold backend TypeScript. The README says which to pick and where to put the Claude Code import in a monorepo. CI fails when a variant drifts from the default.
- **Compatibility:** says plainly that no agent runs are recorded yet, instead of implying tested versions.

**Lower token use** (same rules, fewer words)

- `SKILL.md` is about a quarter shorter: the provenance paragraph and the tool compatibility notes moved to the README, and sections 1, 6 and 9 are tighter.
- Split out of the two largest references, so a task loads only the part it needs: `typescript-config.md` (toolchain and tsconfig) from `typescript.md`; `auth.md` (sessions, tokens, OAuth, CSRF, login) and `ai-features.md` (LLM features) from `security.md`. The index has a row for each.
- Reference files no longer carry source tags (the legend line and the `[docs, GL]` markers on headings and rules); provenance stays with the maintainer.
- `assets/vue.instructions.md` and the skill description say the same rules in fewer words.

**Docs and checks**

- README: numbered install steps for both tools with macOS/Linux and PowerShell commands, how to update, and how to confirm the skill loaded in Copilot Chat, Copilot CLI and the cloud agent.
- **Checks:** every skill file must be valid UTF-8 with LF line endings and no BOM or control bytes; `.gitattributes` keeps text files LF. CI also runs `skills-ref validate` from the Agent Skills project. `evals/prompts.md` results record the model.

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
