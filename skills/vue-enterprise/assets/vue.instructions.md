---
applyTo: "**/*.vue,**/*.ts"
---
# Vue conventions (always on)

Scope: browser-facing Vue code and its tests. Server routes, Node services, build config and scripts follow their own conventions, except that Nuxt server routes still follow the security rules in the `vue-enterprise` skill.

Security rules always apply. Beyond them, the project's own instructions and established conventions (lint config, layout, casing, component library) win over these rules; say so when you disagree. Legacy patterns (Options API, Vuex, mixins) are not conventions to copy: don't extend them, and ask when unsure. For anything beyond this list, load the `vue-enterprise` skill.

- New SFCs use Vue 3 `<script setup lang="ts">`. No Options API, mixins or Vue 2 patterns in new code.
- Client state goes in Pinia setup stores; never add Vuex. Server data lives in the project's query cache (Pinia Colada in new apps; keep an existing library such as TanStack Query) and is never copied into a Pinia store. Don't switch query libraries as part of unrelated work.
- State lives at the lowest component above all its consumers. Escalate one step at a time: local `ref`, parent, slots, composable, typed `provide`/`inject`, then Pinia.
- Features own their code. Imports point `app/` → `features/` → `shared/`, and never into another feature's internals.
- Naming: multi-word component names (except `App`), PascalCase tags in templates, one filename casing per project, composables `useX.ts`, stores `useXStore`. A pure function doesn't get the `use` prefix.
- Never mutate a prop, model, injected value or another owner's store state. Emit an event or call an action.
- Derive with `computed`; watchers are for side effects only. Pass props to `watch` or a composable as a getter (`() => props.id`).
- Whatever starts a listener, timer, observer or request also cleans it up. Use VueUse for this when it has a matching function.
- `v-html` only takes output from the shared sanitizer (`sanitizeHtml`), marked `// eslint-disable-next-line vue/no-v-html -- sanitized by sanitizeHtml`. Never write `innerHTML` or `eval`, and pass a user URL to `:href` or `:src` only after checking its scheme is `https:` or `mailto:`.
- No secrets in `VITE_*` variables or `runtimeConfig.public`.
- New code has no `any`, `as any`, `as Error`, non-null `!` (outside tests), `@ts-ignore` or `console.log`. Parse user input, route params, storage, env and API data; don't cast it.
- Accessibility, WCAG 2.2 AA:
  - `<button>` for actions and `<a href>` for navigation, never `<div @click>`.
  - Every input has a visible `<label>`, and icon-only buttons have an accessible name.
  - Every `:hover` style has a matching `:focus-visible` style; drag interactions have a click or keyboard alternative.
  - Dialogs trap focus, close on Escape and return focus to the trigger.
- User-visible text goes through i18n when the project has it.
- Done means the project's type-check (`vue-tsc`), lint and relevant tests pass, with new behaviour tested. Report any that fail or don't exist.
