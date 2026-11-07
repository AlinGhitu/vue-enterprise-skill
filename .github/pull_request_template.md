## What changes

<!-- One topic per pull request. Which files, and what an agent will now do differently. -->

## Sources

<!-- A link for every new or changed rule, official docs first. Write "none" for wording, link or tooling fixes. -->

## Checklist

- [ ] `pnpm check` passes in `checks/`
- [ ] New or changed `ts`, `vue` or `js` code blocks are listed in `checks/scripts/snippets.mjs`
- [ ] Regenerated files (`pnpm snippets`, `pnpm variants`) are committed, and no `GENERATED` file or variant was edited by hand
- [ ] Rules are written as intent, not tool names, and disagreements between sources are marked ⚖ with the reason
- [ ] No version bump or `CHANGELOG.md` entry (the maintainer adds them at release)
