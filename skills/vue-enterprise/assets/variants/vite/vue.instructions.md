---
applyTo: "src/**/*.vue,src/**/*.ts,e2e/**/*.ts"
---
# Vue conventions (always on)

Scope: browser-facing Vue code and its tests; Nuxt server routes follow the security rules only. Security rules always apply; otherwise the project's own instructions and conventions (lint config, layout, casing, component library) win, and you say when you disagree. Don't extend legacy patterns (Options API, Vuex, mixins); ask when unsure. For anything beyond this list, load the `vue-enterprise` skill.

- New SFCs use `<script setup lang="ts">`.
- Client state goes in Pinia setup stores, never Vuex. Server data stays in the project's query cache (Pinia Colada in new apps; keep an existing library such as TanStack Query), never copied into a store.
- State lives at the lowest component above all its consumers. Escalate one step at a time: local `ref`, parent, slots, composable, typed `provide`/`inject`, then Pinia.
- Features own their code. Imports point `app/` → `features/` → `shared/`, never into another feature's internals.
- Naming: multi-word component names (except `App`), PascalCase tags in templates, one filename casing per project, composables `useX.ts`, stores `useXStore`; pure functions get no `use` prefix.
- Change a prop, model, injected value or another owner's store state only by emitting an event or calling an action.
- Derive with `computed`; watchers are for side effects only. Pass props to `watch` or a composable as a getter (`() => props.id`).
- Whatever starts a listener, timer, observer or request cleans it up, with VueUse when it has a matching function.
- `v-html` only takes `sanitizeHtml` output, marked `// eslint-disable-next-line vue/no-v-html -- sanitized by sanitizeHtml`. No `innerHTML` or `eval`; a user URL reaches `:href` or `:src` only after its scheme is checked to be `https:` or `mailto:`.
- No secrets in `VITE_*` variables or `runtimeConfig.public`.
- New code has no `any`, `as any`, `as Error`, non-null `!` (outside tests), `@ts-ignore` or `console.log`. Parse user input, route params, storage, env and API data instead of casting it.
- Accessibility, WCAG 2.2 AA: `<button>` for actions and `<a href>` for navigation; a visible `<label>` on every input and an accessible name on icon-only buttons; a `:focus-visible` style for every `:hover` style; a click or keyboard alternative to drag; dialogs trap focus, close on Escape and return focus to the trigger.
- User-visible text goes through i18n when the project has it.
- Done means type-check (`vue-tsc`), lint and relevant tests pass, with new behaviour tested. Report any that fail or don't exist.
