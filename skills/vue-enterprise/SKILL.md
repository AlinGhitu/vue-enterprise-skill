---
name: vue-enterprise
description: Organization conventions for Vue 3 + TypeScript apps, Nuxt included (Composition API, Pinia, Pinia Colada, Vue Router, Vitest, Playwright). Use when creating, refactoring, reviewing or testing Vue code - .vue components, useX composables, Pinia stores, data fetching and mutations, routes and guards, forms, Vue tests - for a security review of a Vue or Nuxt app, or to decide where a Vue file, state or logic belongs. Not for React, Angular, Svelte or plain HTML/CSS, backend code outside a Vue or Nuxt app, or TypeScript and Node work that touches no Vue code.
---

# Vue enterprise conventions

Load only the reference files the task touches (section 7). ⚖ in a reference marks a rule where sources disagree; the reason is on the same line.

## 1. Read the project before writing

### Which rule wins

Apply the first that fits:

1. Security rules ([security](references/security.md)) and section 8, "Done means".
2. The project's instructions: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `CONTRIBUTING.md`. Team overrides of this skill sit under a "Vue overrides" heading in `AGENTS.md`, each naming the rule it replaces.
3. The project's established conventions: lint and format config, folder layout, filename casing, path aliases, auto-imports, component library. Match them silently.
4. This skill.
5. General Vue knowledge.

Legacy patterns (Options API, Vuex, mixins, event bus) are not conventions to match: follow [migration](references/migration.md). Convert the whole unit or add the new code beside it, and say which. If a project instruction requires the legacy pattern, follow it and point out the conflict. If still unclear, ask before writing code.

### Versions

Read `package.json`. Below a gate, use the fallback the reference file gives:

| Needs | APIs |
|---|---|
| Vue 3.3 | `defineOptions`, `defineSlots`, generic components, imported types in macros, `toValue` / `MaybeRefOrGetter`, `app.runWithContext` |
| Vue 3.4 | `defineModel`, `watch` `once`, computed `oldValue`, `:id` shorthand, `ComponentInstance<T>`; TSX needs `jsxImportSource: "vue"` |
| Vue 3.5 | reactive props destructure, `useTemplateRef`, `useId`, `onWatcherCleanup`, `watch` `deep: <number>` / `pause` / `resume`, lazy hydration, `<Teleport defer>`, `app.onUnmount` |
| Vue 3.6 (pre-release) | Vapor Mode (`<script setup vapor>`) only when the user asks ([migration](references/migration.md)) |
| TypeScript 6.x | `vue-tsc`, the Vue language server, typescript-eslint. TypeScript 7 has no compiler API: pin `~6.0` or alias it ([typescript config](references/typescript-config.md)) |

Package minimums: Pinia 4 needs Pinia Colada ≥ 1.4.1; Colada ≥ 1.4.3 needs Vue ≥ 3.5.41, Colada 1.0–1.4.2 need Vue ≥ 3.5.17.

Stack default when nothing is established: `<script setup lang="ts">`, Vue ≥ 3.5.41, Pinia 4, Pinia Colada ≥ 1.4.3 for server data, Vue Router 5, Vitest + Vue Test Utils, Playwright, `vue-tsc`. Nuxt when the app needs SSR, SSG or server routes ([nuxt](references/nuxt.md)).

## 2. Place the code

Features own their components, composables, queries, API calls and pages. Dependencies point **downward**: `app/` → `features/` → `shared/`. **Promotion rule**: code moves to `shared/` when a second feature needs it; **demotion rule**: shared code only one feature uses moves back. Features don't import each other's internals; when two keep reaching into each other, give one a small public API, extract the shared part, or merge them. Details → [architecture](references/architecture.md).

## 3. Shape the components

Split a feature into **controller components** (fetch, orchestrate, own state) and **humble components** (props in, events out, no business logic) wherever UI owns data or parts evolve independently; a small component doing one job can keep both roles. Split when a root `v-if` switches between unrelated renderings, props fall into groups never used together, or the template has several independent sections. Details → [components](references/components.md).

## 4. Place the state

Keep **state distance** minimal: state lives at the lowest component above all its consumers. Escalate only as far as needed: local `ref` → common parent → **slots** (the owner renders the deep child) → composable → typed `provide`/`inject` → Pinia store.

**Server data is a cache, not state**: it lives in the query cache (Pinia Colada), never copied into a store. Details → [state and data](references/state-and-data.md), [server data](references/server-data.md).

## 5. Write the reactivity

- Derive with `computed`; watchers are for side effects only.
- Default to `ref`; `shallowRef` for large, external or replace-only data.
- Pass props to `watch` or a composable as a getter (`() => props.id`).
- Whatever starts a listener, timer, observer or request cleans it up.

Details → [reactivity](references/reactivity.md); composable contract → [composables](references/composables.md).

## 6. Reuse VueUse before writing a composable

- Before hand-writing browser or DOM API code, listeners, storage, debounce/throttle, timers, or element size/scroll/focus/visibility tracking: if a `vueuse-functions` skill is available, load it for choosing and calling the composable; otherwise use [vueuse-mapping](references/vueuse-mapping.md). Never stall on the missing skill.
- Write a custom composable only for a documented reason (bundle budget, SSR edge case, dependency policy, uncovered behaviour), stated in its doc comment. In reviews, flag hand-written logic VueUse covers and name the replacement.
- This skill wins on architecture, state, typing, testing and security: server data stays in Pinia Colada (not `useFetch`), app-wide state in Pinia (not `createGlobalState`), no `useEventBus`, `defineModel` over `useVModel`.
- If `@vueuse/core` (or `@vueuse/router`, `@vueuse/integrations`) is missing from `package.json`, propose adding it; don't install silently.

## 7. Reference index

| Task touches — or symptom seen | Read |
|---|---|
| Folders, naming, module boundaries, monorepos, wrapping libraries, bootstrap · "where does this file go?" | [architecture](references/architecture.md) |
| Component design, props/emits/slots/v-model, attrs, dialogs, styling, design system · prop mutation warning, parent `@click` not firing | [components](references/components.md) |
| ref/reactive/computed/watch, template refs, keys, nextTick, effect scopes · UI not updating, watcher not firing, ref `null`, list items keep wrong state | [reactivity](references/reactivity.md) |
| Writing or reviewing a `useX` composable · leaking listeners, hook warning after `await` | [composables](references/composables.md) |
| Replacing hand-written browser, timer, storage or observer code; adding `@vueuse/*` | [vueuse-mapping](references/vueuse-mapping.md) |
| Pinia, provide/inject, SSR-safe state · prop drilling, `inject` returns `undefined`, state leaking between requests or tests | [state and data](references/state-and-data.md) |
| Fetching, caching, mutations, optimistic updates, polling, API layer · stale data after save, duplicate requests, race conditions | [server data](references/server-data.md) |
| Typing props/emits/slots/models/refs, generic components, stores, routes, API payloads, schema validation, `any`/enum/`satisfies`, augmentation · `res.json()` or `import.meta.env` typed `any` | [typescript](references/typescript.md) |
| TypeScript version, tsconfig, strictness flags, `strictTemplates`, `vue-tsc` setup · `vue-tsc` broke after a `typescript` upgrade, a template typo passed CI | [typescript config](references/typescript-config.md) |
| Error handling, boundaries, monitoring · errors vanish silently, noisy monitoring | [errors](references/errors.md) |
| Forms and validation · edits leak into the source before submit, server validation errors | [forms](references/forms.md) |
| Routes, guards, layouts, file-based routing, data loaders · view doesn't reload on param change | [routing](references/routing.md) |
| Writing tests or choosing what to test · brittle, flaky or leaky tests | [testing](references/testing.md) |
| Bundle size, list rendering, slow updates · slow first load, laggy list | [performance](references/performance.md) |
| `v-html`, user URLs/styles, CSP, secrets, SSR routes, redirects, third-party scripts, logging | [security](references/security.md) |
| Login, sessions, cookies, tokens, OAuth/OIDC, CSRF, passkeys, permissions in the UI, logout | [auth](references/auth.md) |
| Chat, LLM or AI-assistant features | [AI features](references/ai-features.md) |
| Reviewing an app or a change for security · "is this safe?", threat model | [security review](references/security-review.md) |
| Dependencies, lockfiles, install scripts, CI hardening, publishing, SRI | [supply chain](references/supply-chain.md) |
| a11y, focus, keyboard, form errors, data tables, drag and drop | [accessibility](references/accessibility.md) |
| User-facing text, plurals, dates, time zones, RTL | [i18n](references/i18n.md) |
| Feature flags, gradual rollout | [feature flags](references/feature-flags.md) |
| Options API / Vuex / Vue 2 leftovers, framework upgrades, Vapor Mode | [migration](references/migration.md) |
| ESLint config, formatting, logging, bundle budgets, env vars | [tooling](references/tooling.md) |
| Nuxt: layout, auto-imports, `useFetch` vs Pinia Colada, `useState`, server routes, error pages | [nuxt](references/nuxt.md) |

## 8. Done means

- The project's own checks pass. Take the type-check, lint and test commands from the `package.json` scripts and run the narrowest applicable ones (commonly `vue-tsc --build` or `--noEmit`, `eslint` with zero warnings, `vitest run <path>`). Report failures with their output and name the checks the project lacks. If you can't run commands, list the exact commands for the author instead of claiming they pass.
- No prop, model, store state or injected state is mutated by a component that doesn't own it.
- Every async side effect has cleanup; no lifecycle hook, `watch`, `inject` or store call after an `await` outside `<script setup>`.
- New or changed behaviour ships with tests in the same change ([testing](references/testing.md)), covering the changed lines.
- New user-visible text goes through i18n when the project has it.
- No new `any`, `as any`, non-null `!` (outside tests), `@ts-ignore` or `console.log`; boundary data (user input, params, storage, env, foreign APIs) is parsed, not cast. Caught errors are narrowed with `instanceof` or converted with `toError()` ([errors](references/errors.md)), never `as Error`.
- Untrusted content reaches the DOM only through the sanitizer module; no secret in `VITE_*` or `runtimeConfig.public`; no new dependency without the lockfile and audit passing.
- No new hand-written listener, timer, storage, observer or debounce code where a VueUse function exists, unless the reason is written next to it.

## 9. Delegating work

A sub-agent doesn't inherit this skill. Give it the paths of the reference files it needs and the project's Vue overrides, and ask it to report its assumptions, the behaviour it changed and the checks it ran.

## Version

1.0.2 · Last checked against the official docs: 2026-09-24. After 2027-03-24, treat the pinned version numbers as unverified: check `package.json` and the official docs before relying on one.
