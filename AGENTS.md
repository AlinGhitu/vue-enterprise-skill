# AGENTS.md

This repository publishes `vue-enterprise`, an Agent Skill with Vue 3 + TypeScript conventions for Claude Code and GitHub Copilot. It holds no Vue app; the files here are the skill, its checks and its docs.

## Layout

- `skills/vue-enterprise/` is the skill: `SKILL.md`, `references/`, and `assets/vue.instructions.md`, the always-on rules that users copy into their app.
- `checks/` is a small Vue project that CI uses to validate the skill. `scripts/snippets.mjs` lists which code blocks are extracted from the references; the generated files carry a `GENERATED` header and must never be edited by hand.
- `evals/` holds `setup.mjs`, which builds a Vue app with the skill installed, and `prompts.md`, the manual prompts for checking agent behaviour in each tool.
- `CHANGELOG.md` records every release.

## Editing the skill

- In `SKILL.md`, the frontmatter holds only `name` and `description`, the two fields both tools accept. VS Code Copilot documents just five fields, and Claude-only keys like `allowed-tools`, `model` or `paths` don't carry over.
- The `name` field must equal the folder name, `vue-enterprise`.
- Write steps as intent ("search the codebase for existing composables"), never as a tool name.
- Links are relative to the skill folder. Don't add scripts that need a particular agent to run them.
- Keep `assets/vue.instructions.md` under 30 lines. It carries only rules that apply to almost every Vue edit; everything else goes in the skill.
- Every rule traces to a source. Where sources disagree, mark the rule ⚖ and give the reason in the same line. Keep survey statistics and the history of a rule out of the skill text; agents can't act on them.
- Code examples must obey the skill's own rules: no `any`, no `as Error`, explicit return types on exports, no native event names in `emits`. When you add or change a `ts`, `vue` or `js` code block, add it to `checks/scripts/snippets.mjs` if it isn't there, then run the checks.

## Checking a change

From `checks/`:

```sh
pnpm install --frozen-lockfile
pnpm snippets   # regenerate the examples from the markdown
pnpm check      # structure, snippet drift, vue-tsc, ESLint with the skill's rules, Vitest
```

## Releasing

1. Bump the version in the `SKILL.md` footer (semver: major when an agent would follow a rule differently, minor for new guidance, patch for fixes) and update "Last checked" when you re-verified facts against the docs.
2. Add a `CHANGELOG.md` entry.
3. Run `evals/prompts.md` in each supported tool and record the results there and in the `SKILL.md` compatibility note.
