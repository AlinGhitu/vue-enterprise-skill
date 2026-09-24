---
name: vue-enterprise
description: Organization conventions for Vue 3 + TypeScript apps, including Nuxt (Composition API, Pinia, Pinia Colada, Vue Router, Vitest, Playwright). Use when creating, refactoring, reviewing or testing Vue code - .vue single-file components, useX composables, Pinia stores, data fetching and mutations, routes and navigation guards, forms, Vue component or store tests - when doing a security review of a Vue or Nuxt app, or when deciding where a Vue file, state or logic belongs. Do not use for React, Angular, Svelte or plain HTML/CSS work, for backend or API-server code outside a Vue or Nuxt app, or for general TypeScript or Node tasks that touch no Vue code.
---

# Vue enterprise conventions

Rules are cross-checked against the official Vue, Pinia, Pinia Colada, Vue Router and Vue Test Utils docs, then tested against community practice (Michael Thiessen, Anthony Fu, Vue School, Markus Oberlehner), GitLab's frontend guide, and large open-source Vue apps. Where sources disagree, the docs win, and the reference file says so (⚖).

## 1. Read the project before writing

### Which rule wins

When rules conflict, apply the first one that fits:

1. Security rules ([security](references/security.md)) and section 8, "Done means".
2. The project's instructions: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `CONTRIBUTING.md`. The short always-on rules live in `.github/instructions/vue.instructions.md` when the repo has it; this skill holds the detail behind them. A team's additions and overrides to this skill go under a "Vue overrides" heading in `AGENTS.md`, each naming the rule it replaces.
3. The project's established conventions: lint and format config, folder layout, filename casing, path aliases, auto-imports, component library. Match them silently.
4. This skill.
5. General Vue knowledge.

Legacy patterns are not conventions to match. In code that uses the Options API, Vuex, mixins or an event bus, follow [migration](references/migration.md): don't extend the legacy pattern. Convert the whole unit, or add the new code beside it, and say which you did. If a project instruction requires the legacy pattern, follow the instruction and point out the conflict. If the right choice is still unclear, ask before writing code.

### Versions

- Read `package.json` for versions. Below a gate, use the fallback the reference file gives:

| Needs | APIs |
|---|---|
| Vue 3.3 | `defineOptions`, `defineSlots`, generic components, imported types in macros, `toValue` / `MaybeRefOrGetter`, `app.runWithContext` |
| Vue 3.4 | `defineModel`, `watch` `once`, computed `oldValue`, `:id` same-name shorthand, `ComponentInstance<T>`; TSX needs `jsxImportSource: "vue"` (global `JSX` namespace removed) |
| Vue 3.5 | reactive props destructure, `useTemplateRef`, `useId`, `onWatcherCleanup`, `watch` `deep: <number>` / `pause` / `resume`, lazy hydration, `<Teleport defer>`, `app.onUnmount` |
| Vue 3.6 (pre-release) | Vapor Mode (`<script setup vapor>`) — only when the user asks; see [migration](references/migration.md) |
| TypeScript 6.x | `vue-tsc`, the Vue language server and typescript-eslint. TypeScript 7 ships no compiler API: pin `~6.0`, or alias `typescript@npm:@typescript/typescript6`; see [typescript](references/typescript.md) |

- Package minimums: Pinia 4 needs Pinia Colada ≥ 1.4.1. Pinia Colada ≥ 1.4.3 needs Vue ≥ 3.5.41; Colada 1.0–1.4.2 need Vue ≥ 3.5.17.
- Stack default when nothing is established: Composition API, `<script setup lang="ts">`, Vue ≥ 3.5.41, Pinia 4, Pinia Colada ≥ 1.4.3 for server data, Vue Router 5, Vitest + Vue Test Utils, Playwright, `vue-tsc`. Nuxt when the app needs SSR, SSG or server routes ([nuxt](references/nuxt.md)).

## 2. Place the code

Features own their components, composables, queries, API calls and pages. Dependencies point **downward** only: `app/` → `features/` → `shared/`. The **promotion rule**: code used by one feature lives in it; it moves to `shared/` when a second feature needs it. The **demotion rule**: shared code that only one feature uses moves back. Features don't import each other's internals. When two keep reaching into each other, fix the boundary: give the feature a small public API, extract the shared capability to `shared/`, or merge them. Details → [architecture](references/architecture.md).

## 3. Shape the components

Default to splitting a feature into **controller components** (fetch, orchestrate, own state) and **humble components** (props in, events out, no business logic), wherever UI owns data or parts evolve independently. A small, cohesive component that does one job can keep both roles. Split when a root `v-if` switches between unrelated renderings, when props fall into groups that are never used together, or when the template has several independent sections. Details → [components](references/components.md).

## 4. Place the state

Keep **state distance** minimal: each piece of state lives at the lowest component above all its consumers. Escalate only as far as needed:

1. Local `ref`.
2. Lift to the common parent.
3. Flatten deep prop chains with **slots**: the owner renders the deep child directly.
4. A composable (reusable logic, per-caller state).
5. `provide`/`inject` with a typed key (subtree context, compound components).
6. A Pinia store (unrelated app areas, devtools, SSR).

**Server data is a cache, not state**: it lives in the query cache (Pinia Colada), never copied into a store. Details → [state and data](references/state-and-data.md), [server data](references/server-data.md).

## 5. Write the reactivity

- Derive with `computed`; watchers are for side effects only.
- Default to `ref`. Use `shallowRef` for large, external or replace-only data.
- Pass props to `watch` or a composable as a getter (`() => props.id`).
- Every listener, timer, observer and request is cleaned up by the code that started it.

Details → [reactivity](references/reactivity.md); composable contract → [composables](references/composables.md).

## 6. Reuse VueUse before writing a composable

- Before writing any composable or utility for browser or DOM APIs (resize, intersection and mutation observers, clipboard, media queries, geolocation), event listeners and their cleanup, local or session storage and persisted state, debounce, throttle, intervals and timeouts, element size, scroll, focus or visibility tracking, or anything that duplicates a VueUse function: check whether a `vueuse-functions` skill is available in this session. If it is, load it and follow it for choosing and calling the composable. If it isn't, continue with [vueuse-mapping](references/vueuse-mapping.md) and vueuse.org; never stall on the missing skill.
- A tested VueUse composable beats a custom implementation. Write a custom one only for a documented reason: a bundle-size budget, an SSR edge case the function doesn't handle, a dependency policy, or behaviour VueUse doesn't cover. State the reason in the composable's doc comment.
- When reviewing or refactoring, flag hand-written logic that VueUse already covers and name the replacement (`useEventListener`, `useDebounceFn`, `useStorage`, `onClickOutside`, …); the table is in [vueuse-mapping](references/vueuse-mapping.md).
- Precedence: this skill owns architecture, folder layout, state placement, typing, testing, security and team conventions; `vueuse-functions` owns composable selection and usage details. So server data stays in Pinia Colada (not `useFetch`), app-wide state in Pinia (not `createGlobalState`), no `useEventBus`, and `defineModel` over `useVModel`; the full list is in the mapping file.
- Dependency hygiene: check `package.json` for `@vueuse/core` (and `@vueuse/router`, `@vueuse/integrations` with their peers) before using it. If it's missing, propose adding it; don't install it silently.

## 7. Reference index

Load a file when the task touches it:

| Task touches — or symptom seen | Read |
|---|---|
| Folders, naming, module boundaries, monorepo packages, wrapping libraries, bootstrap config · "where does this file go?" | [architecture](references/architecture.md) |
| Component design, splitting, props/emits/slots/v-model, attrs, dialogs, styling, using the design system · component too big, prop mutation warning, parent `@click` not firing | [components](references/components.md) |
| ref/reactive/computed/watch, template refs, keys, nextTick, effect scopes · UI not updating, watcher not firing, template ref `null`, list items keep the wrong state | [reactivity](references/reactivity.md) |
| Writing or reviewing a `useX` composable · listeners leaking, hook warning after `await` | [composables](references/composables.md) |
| Replacing hand-written browser, timer, storage or observer code with VueUse; deciding when not to; adding `@vueuse/*` | [vueuse-mapping](references/vueuse-mapping.md) (with the `vueuse-functions` skill when available) |
| Client state: Pinia, provide/inject, SSR-safe state · prop drilling, `inject` returns `undefined`, state leaking between SSR requests or tests | [state and data](references/state-and-data.md) |
| Fetching, caching, mutations, optimistic updates, polling, API layer · stale data after a save, duplicate requests, older response overwrites newer | [server data](references/server-data.md) |
| TypeScript version and tsconfig, typing props/emits/slots/models/refs, generic components, stores, routes, API payloads, schema validation, `any`/enum/`satisfies` conventions, type augmentation · `vue-tsc` errors, `vue-tsc` broke after a `typescript` upgrade, a template typo passed CI, `import.meta.env` or `res.json()` typed `any` | [typescript](references/typescript.md) |
| Error handling, boundaries, monitoring, error messages · production errors vanish silently, noisy monitoring | [errors](references/errors.md) |
| Forms and validation · edits leak into the source before submit, server validation errors | [forms](references/forms.md) |
| Routes, guards, layouts, file-based routing, data loaders · view doesn't reload when a param changes | [routing](references/routing.md) |
| Writing tests or choosing what to test · brittle, flaky or leaky tests | [testing](references/testing.md) |
| Bundle size, list rendering, slow updates · slow first load, laggy list, janky animation | [performance](references/performance.md) |
| `v-html`, user URLs/styles, CSP, secrets, auth/sessions/cookies, CSRF, SSR routes, third-party scripts, AI/LLM features · rendering user content, tokens, login flow | [security](references/security.md) |
| Reviewing an app or a change for security · "is this safe?", pentest prep, threat model | [security review](references/security-review.md) |
| Dependencies, lockfiles, install scripts, CI hardening, publishing, SRI | [supply chain](references/supply-chain.md) |
| a11y, dialogs, focus, keyboard shortcuts, form errors, data tables, drag and drop | [accessibility](references/accessibility.md) |
| User-facing text, plurals, dates, time zones, RTL | [i18n](references/i18n.md) |
| Feature flags, gradual rollout | [feature flags](references/feature-flags.md) |
| Legacy code, Options API / Vuex / Vue 2 leftovers, framework upgrades, Vapor Mode | [migration](references/migration.md) |
| ESLint rules and config, formatting, logging, bundle budgets, dependencies, env vars | [tooling](references/tooling.md) |
| Nuxt apps: directory layout, auto-imports, `useFetch` vs Pinia Colada, `useState`, server routes, error pages | [nuxt](references/nuxt.md) |

## 8. Done means

- The project's own checks pass. Find the type-check, lint and test commands in the `package.json` scripts and run the narrowest applicable ones (commonly `vue-tsc --build` or `vue-tsc --noEmit`, `eslint` with zero warnings, `vitest run <path>`). Report failures with their output, and say plainly which checks the project doesn't have. If you can't run commands in this context, list the exact commands for the author to run instead of claiming they pass.
- No prop, model, store state or injected state is mutated by a component that doesn't own it.
- Every async side effect has cleanup; no lifecycle hook, `watch`, `inject` or store call happens after an `await` outside `<script setup>`.
- New or changed behaviour ships with tests in the same change ([testing](references/testing.md)), and the changed lines are covered.
- New user-visible text goes through i18n when the project has it.
- New code adds no `any`, `as any`, non-null `!` (outside tests) or `@ts-ignore`, and no `console.log`; data crossing a boundary (user input, params, storage, env, foreign APIs) is parsed, not cast. Caught errors are narrowed with `instanceof` or converted with `toError()` ([errors](references/errors.md)), never cast with `as Error`.
- Untrusted content reaches the DOM only through the sanitizer module; no secret sits in `VITE_*` or `runtimeConfig.public`; no new dependency was added without the lockfile and audit passing.
- No new hand-written listener, timer, storage, observer or debounce code where a VueUse function exists (section 6), unless the reason is written next to it.

## 9. Delegating work

When you hand part of a Vue task to a sub-agent (audits, parallel file reviews, refactors, test generation, research), give it the paths of the reference files it needs, from this folder, and the project's Vue overrides (`AGENTS.md`): it doesn't inherit this skill's context. Ask it to report its assumptions, the behaviour it changed, and which checks it ran. Use the models and tools the host environment approves; this skill doesn't require a particular model.

## Compatibility

- **Supported:** Claude Code, and GitHub Copilot in VS Code agent mode, Copilot CLI and the Copilot cloud (coding) agent. It uses the open Agent Skills format with only the `name` and `description` frontmatter fields, which every one of these tools accepts. No scripts; every reference path is relative to this folder.
- **Tested versions:** checked against each tool's docs on 2026-09-24; record the versions you tested here after running the trigger tests.
- **Known differences:**
  - Loading. Both tools load the skill when its description matches the task, or when it's invoked as `/vue-enterprise`. Each decides relevance its own way, so the same prompt can load it in one tool and not the other. If it doesn't load, name the skill in the prompt.
  - Always-on rules. Copilot applies `.github/instructions/vue.instructions.md` only to `.vue` and `.ts` files it reads or edits. Claude Code loads the same file at session start when the project's `AGENTS.md` or `CLAUDE.md` imports it (`@.github/instructions/vue.instructions.md`). A copy to install ships in `assets/vue.instructions.md`.
  - Copilot code review reads the skill and instructions but can't run commands. It lists the section 8 checks for the author instead.

## Version

Version 1.0.1 · Last checked against the official docs: 2026-09-24 · Maintainer: Alin Ghitu ([AlinGhitu/vue-enterprise-skill](https://github.com/AlinGhitu/vue-enterprise-skill)); changes are listed in the repository's `CHANGELOG.md`. The version numbers pinned in this skill were current on that date. Six months after it, treat them as unverified: check `package.json` and the official docs before relying on one.
