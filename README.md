# vue-enterprise

An [Agent Skill](https://agentskills.io) with conventions for large, long-lived Vue 3 + TypeScript apps, Nuxt included. It covers Composition API, Pinia, Pinia Colada, Vue Router, Vitest and Playwright. It works in Claude Code and in GitHub Copilot (VS Code agent mode, Copilot CLI, and the Copilot cloud agent).

Every rule is checked against the official Vue, Pinia, Pinia Colada, Vue Router and Vue Test Utils docs, then tested against community practice and open-source Vue apps. Where sources disagree, the reference files mark the choice with ⚖ and give the reason. CI compiles, lints and runs the skill's code examples on every change, using the skill's own TypeScript and ESLint settings. Releases are listed in [CHANGELOG.md](CHANGELOG.md).

## Install

Run these from the root of your app repository.

1. Copy the skill to `.claude/skills/vue-enterprise/`. Claude Code reads skills only from `.claude/skills/`; Copilot reads that folder too (as well as `.github/skills/` and `.agents/skills/`), so one copy serves both tools.
2. Copy the always-on rules to `.github/instructions/vue.instructions.md`. The skill loads only when a task matches its description; these rules apply to every `.vue` and `.ts` edit. In a repository that also holds backend TypeScript, copy a [narrower variant](#narrower-scope-for-mixed-repositories) instead.
3. For Claude Code, add this line to your app's `AGENTS.md` (or `CLAUDE.md`) so it loads the same rules. Copilot needs no extra step.

   ```md
   @.github/instructions/vue.instructions.md
   ```

4. Commit both folders. The Copilot cloud agent and Copilot code review read only what is in the repository; code review uses the versions on the pull request's branch.

macOS, Linux, Git Bash:

```sh
git clone --depth 1 https://github.com/AlinGhitu/vue-enterprise-skill.git /tmp/vue-enterprise-skill
mkdir -p .claude/skills .github/instructions
cp -r /tmp/vue-enterprise-skill/skills/vue-enterprise .claude/skills/
cp /tmp/vue-enterprise-skill/skills/vue-enterprise/assets/vue.instructions.md .github/instructions/
```

Windows PowerShell:

```powershell
git clone --depth 1 https://github.com/AlinGhitu/vue-enterprise-skill.git "$env:TEMP\vue-enterprise-skill"
New-Item -ItemType Directory -Force .claude\skills, .github\instructions | Out-Null
Copy-Item -Recurse "$env:TEMP\vue-enterprise-skill\skills\vue-enterprise" .claude\skills\
Copy-Item "$env:TEMP\vue-enterprise-skill\skills\vue-enterprise\assets\vue.instructions.md" .github\instructions\
```

To update, delete `.claude/skills/vue-enterprise/`, copy the new version in the same way, and copy `vue.instructions.md` again. Check [CHANGELOG.md](CHANGELOG.md) for what changed.

### Narrower scope for mixed repositories

The default `vue.instructions.md` applies to every `.vue` and `.ts` file in the repository. When the repository also holds backend or tooling TypeScript, copy a variant from `skills/vue-enterprise/assets/variants/` instead. The rules are identical; only `applyTo` differs:

| Variant | Layout | `applyTo` |
|---|---|---|
| `vue.instructions.md` (default) | Vue-only repository, Nuxt 3 layout | `**/*.vue,**/*.ts` |
| `variants/vite/` | Vite app in `src/`, Playwright in `e2e/` | `src/**/*.vue,src/**/*.ts,e2e/**/*.ts` |
| `variants/nuxt/` | Nuxt 4 (`app/`, `server/`, `shared/`) | `app/**/*.vue,app/**/*.ts,server/**/*.ts,shared/**/*.ts` |
| `variants/monorepo/` | Frontend in `apps/web`, components in `packages/ui` | `apps/web/**/*.vue,apps/web/**/*.ts,packages/ui/**/*.vue,packages/ui/**/*.ts`: edit the paths to your packages |

Claude Code loads imported instructions for the whole session, whatever `applyTo` says. In a monorepo, put the `@` import in the frontend package's `CLAUDE.md` instead of the root one, so it loads only when Claude works in that folder.

## Use

The skill loads by itself when a task involves Vue components, composables, Pinia stores, data fetching, routes, forms, Vue tests, Nuxt, or a Vue/Nuxt security review. To force it, start the prompt with `/vue-enterprise`.

**GitHub Copilot in VS Code**

- Use Copilot Chat in agent mode.
- Skills and `applyTo` instructions are on by default. If nothing loads, check that the settings `chat.useAgentSkills` and `chat.includeApplyingInstructions` are enabled.
- Type `/` in the chat input to see `vue-enterprise` in the list.
- To confirm it loaded, expand **References** under Copilot's answer and look for `SKILL.md` and `vue.instructions.md`. For more detail, run **Developer: Open Agent Debug Logs** from the Command Palette.

**Copilot CLI**

- `/skills list` shows the skills it found; `/skills info vue-enterprise` shows where it loaded this one from.
- After copying in a new version, run `/skills reload`.

**Copilot cloud agent and code review** pick up the committed skill and instructions with no setup. Code review can't run commands, so it lists the checks for the author to run.

## Compatibility

- **Supported:** Claude Code, and GitHub Copilot in VS Code agent mode, Copilot CLI and the Copilot cloud (coding) agent. The skill uses the open Agent Skills format with only the `name` and `description` frontmatter fields, which every one of these tools accepts. No scripts; every reference path is relative to the skill folder.
- **Tested versions:** none recorded yet. Support is based on each tool's documentation as of 2026-09-24; agent runs (tool version, model, skill version, date, result) are recorded in [evals/prompts.md](evals/prompts.md).
- **Known differences:**
  - Loading. Both tools load the skill when its description matches the task, or when it's invoked as `/vue-enterprise`. Each decides relevance its own way, so the same prompt can load it in one tool and not the other. If it doesn't load, name the skill in the prompt.
  - Always-on rules. Copilot applies `.github/instructions/vue.instructions.md` only to `.vue` and `.ts` files it reads or edits. Claude Code loads the same file at session start when the project's `AGENTS.md` or `CLAUDE.md` imports it.

## Adapting it to your organization

Don't edit the installed skill: updates would overwrite your changes. Put additions and overrides in your app's `AGENTS.md` under a "Vue overrides" heading, each naming the rule it replaces and why. The skill tells agents to apply those first.

## Layout

```
skills/vue-enterprise/
├── SKILL.md                 entry point: which rule wins, workflow, reference index, version
├── references/              detailed guidance, loaded on demand
└── assets/                  vue.instructions.md (always-on rules) and variants/ with narrower applyTo
checks/                      CI project that validates the skill and its examples
evals/                       setup script and manual prompts to check agent behaviour per tool
```

## Contributing

See [AGENTS.md](AGENTS.md) for editing rules, running the checks and releasing.

## License

[MIT](LICENSE)
