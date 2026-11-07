# Contributing

Thanks for helping improve `vue-enterprise`. This repository holds an Agent Skill, not a Vue app: a change is usually a rule, a code example or a doc, plus the checks that keep them honest.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, follow [SECURITY.md](SECURITY.md) instead of opening an issue.

## What helps most

- **A rule that is wrong or out of date.** Open an issue with the file, the heading and a link to the source that shows the correct behaviour.
- **An agent that ignored or misapplied the skill.** Say which tool and version, which model, which skill version, the prompt, and what the agent wrote. If you can, check whether the skill loaded at all (the README explains how per tool).
- **Eval runs.** No agent runs are recorded yet. Running the prompts in [evals/prompts.md](evals/prompts.md) in a supported tool and sending the results is one of the most useful contributions.
- **New guidance.** Open an issue first, so we can agree it belongs in the skill before you write it. The skill stays small on purpose: a rule earns its place when agents get it wrong without it.

Typos, broken links and small wording fixes can go straight to a pull request.

For questions about using the skill, or an idea you'd like to talk through first, start a thread in [Discussions](https://github.com/AlinGhitu/vue-enterprise-skill/discussions).

## Rules for changes

The editing rules live in [AGENTS.md](AGENTS.md), which coding agents read too. The short version:

- Every rule needs a source. Put the link in the pull request description (official Vue, Pinia, Pinia Colada, Vue Router, Vue Test Utils, Nuxt or Vitest docs first; community practice and open-source apps as support). Reference files carry no source tags; the maintainer records provenance.
- Where sources disagree, mark the rule ⚖ and give the reason in the same line.
- Write steps as intent ("search the codebase for existing composables"), never as one tool's name.
- Code examples obey the skill's own rules: no `any`, no `as Error`, explicit return types on exports, no native event names in `emits`.
- `assets/vue.instructions.md` stays under 30 lines. Edit the default file, then regenerate the variants; never edit a variant or a `GENERATED` file by hand.
- Don't bump the version or edit `CHANGELOG.md`. The maintainer does both when cutting a release.

## Running the checks

You need Node 24 and the pnpm version named in `packageManager` in `checks/package.json`.

```sh
cd checks
pnpm install --frozen-lockfile
pnpm snippets   # regenerate the examples from the markdown
pnpm variants   # regenerate the applyTo variants of vue.instructions.md
pnpm check      # structure, text, snippet and variant drift, vue-tsc, ESLint, Vitest
```

If you add or change a `ts`, `vue` or `js` code block in a reference file, add it to `checks/scripts/snippets.mjs` so CI compiles and lints it. CI runs the same `pnpm check` on every pull request, plus the Agent Skills reference validator.

## Pull requests

- Keep each pull request to one topic, and fill in the template.
- Commit the regenerated files together with the markdown change that produced them.
- AI-assisted contributions are welcome. You are responsible for what you submit: read it, run the checks, and make sure every rule has a source you have checked yourself.
- A maintainer reviews every pull request before it merges. Expect a reply within a week.

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE) that covers this repository.
