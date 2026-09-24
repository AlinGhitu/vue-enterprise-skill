# vue-enterprise

An [Agent Skill](https://agentskills.io) with conventions for large, long-lived Vue 3 + TypeScript apps, Nuxt included. It covers Composition API, Pinia, Pinia Colada, Vue Router, Vitest and Playwright. It works in Claude Code and in GitHub Copilot (VS Code agent mode, Copilot CLI, and the Copilot cloud agent).

Every rule is checked against the official Vue, Pinia, Pinia Colada, Vue Router and Vue Test Utils docs, then tested against community practice and open-source Vue apps. Where sources disagree, the reference files mark the choice with ⚖ and give the reason. CI compiles, lints and runs the skill's code examples on every change, using the skill's own TypeScript and ESLint settings. Releases are listed in [CHANGELOG.md](CHANGELOG.md).

## Install

Put the skill into your app repository at `.claude/skills/vue-enterprise/`. Claude Code reads skills only from `.claude/skills/`, and Copilot reads that folder as well, so one copy serves both tools.

With the [skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add AlinGhitu/vue-enterprise-skill
```

Or copy it by hand:

```sh
git clone https://github.com/AlinGhitu/vue-enterprise-skill.git
cp -r vue-enterprise-skill/skills/vue-enterprise <your-app>/.claude/skills/
```

## Add the always-on rules (recommended)

The skill loads only when a task matches its description. A short set of rules should apply to every Vue edit, so install them as instructions:

1. Copy `skills/vue-enterprise/assets/vue.instructions.md` to `<your-app>/.github/instructions/vue.instructions.md`. Copilot then applies it to every `.vue` and `.ts` file it reads or edits.
2. Add this line to your app's `AGENTS.md` (or `CLAUDE.md`), so Claude Code loads the same file:

   ```md
   @.github/instructions/vue.instructions.md
   ```

## Use

Both tools load the skill when a task involves Vue components, composables, Pinia stores, data fetching, routes, forms, Vue tests, Nuxt, or a Vue/Nuxt security review. You can also call it directly with `/vue-enterprise`.

## Adapting it to your organization

Don't edit the installed skill: updates would overwrite your changes. Put additions and overrides in your app's `AGENTS.md` under a "Vue overrides" heading, each naming the rule it replaces and why. The skill tells agents to apply those first.

## Layout

```
skills/vue-enterprise/
├── SKILL.md                 entry point: which rule wins, workflow, reference index, version
├── references/              detailed guidance, loaded on demand
└── assets/vue.instructions.md
checks/                      CI project that validates the skill and its examples
evals/                       setup script and manual prompts to check agent behaviour per tool
```

## Contributing

See [AGENTS.md](AGENTS.md) for editing rules, running the checks and releasing.

## License

[MIT](LICENSE)
