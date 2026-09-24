# Legacy code and migrations

Source tags: [GL] GitLab (Vue 2→3 and Vuex→Pinia migrations) · [CB] open-source codebases · [docs] vuejs.org, Vue changelog.

Large apps are always partly mid-migration. The goal is to stop the old pattern spreading, then remove it in small, reversible steps.

## Containing legacy code [CB, GL]

- Name the legacy paths explicitly: a `deprecated/` folder, `@deprecated` JSDoc on old APIs, and a note in `AGENTS.md`. People and agents copy what they see; make the old pattern visibly old.
- New code never extends a legacy module (an old service layer, a Vuex store, a mixin). Add the new version next to it and move callers over.
- Keep a lint baseline of grandfathered files so only new code must follow the new rules (see [tooling](tooling.md)).
- Whoever changes shared code updates its consumers; for large moves, invest in a codemod rather than asking every team to migrate by hand.

## Options API → Composition API [GL, docs]

- The Options API isn't deprecated; migrate for maintainability, not urgency.
- Convert a whole component at a time. Don't add `setup()` to an Options API component and leave the rest: mixed-style components are the hardest to read.
- Replace mixins with composables; replace `this.$parent`/event buses with props, events, provide/inject or a store.
- Vue 2-only patterns to remove on sight: filters (use functions or `computed`), `$on`/`$off`/`$once` event buses (if an app-wide bus is really needed, wrap `mitt` in one module), `functional: true` components, the `slot="x"` attribute (use `#x`), `.sync` (use `v-model:x`).

## Vuex → Pinia [GL]

- Migrate in this order: static values out of the store (constants, config) → local-only state back into components → shared state into Pinia stores → server data into the query cache.
- One store at a time, with tests green between steps. Keep the period where Vuex and Pinia coexist short, and never sync state between them.
- Getters that don't need store context become plain functions.

## Framework upgrades [GL]

- Ship big migrations behind a runtime flag per entry point, so old and new builds can run side by side and each can be rolled back.
- Hide version differences in adapters kept in one directory; touch consumer code as little as possible.
- Verify each migrated page in a real browser with the flag off and on. Any new console error or compat warning is a regression, even with green unit tests.

## Vapor Mode (Vue 3.6, pre-release) [docs]

- Vapor Mode (`<script setup vapor>`) compiles components without the virtual DOM. It's in Vue 3.6, which isn't stable yet. Don't add it to an existing app unless the user asks.
- When it is adopted, use it for a distinct region (a performance-sensitive page, or a small new app), not nested back and forth with regular components.
- Inside Vapor components: no Options API, `app.config.globalProperties`, `getCurrentInstance()`, `v-memo`, `@vue:` lifecycle events, or `$el`/`$props`/`$attrs`/`$slots`/`$refs` access through component template refs. Custom directives use a different signature. Check slot content in the template, not by calling `slots.x()` in script.
