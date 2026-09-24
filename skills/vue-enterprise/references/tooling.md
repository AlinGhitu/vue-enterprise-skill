# Tooling

Source tags: [docs] vuejs.org / eslint.vuejs.org / Pinia · [TS] TypeScript release notes · [AF] Anthony Fu · [VS] Vue School · [GL] GitLab · [MO] Markus Oberlehner · [CB] open-source codebases.

The project's existing tooling wins. These rules are for setting up a new project or filling a gap.

## Scaffold [docs]

- `npm create vue@latest` (TypeScript, Router, Pinia, Vitest, ESLint, Playwright as needed), or Nuxt when you need SSR, SSG or server routes.
- Vite as the dev server and bundler. Vue CLI is in maintenance mode.
- Pinia 4: `npm i pinia @vue/devtools-api` (the devtools API is a required peer dependency; Pinia 4 needs TypeScript ≥ 5.6). `@pinia/testing@2` needs Pinia ≥ 4.0.2.

## ESLint [docs, VS, AF, GL, CB]

- Flat config (`eslint.config.js`). Legacy `.eslintrc` was deprecated in ESLint 9 and removed in ESLint 10.
- `flat/strongly-recommended` and `flat/recommended` rules are **warnings** by default, so CI passes with violations. Use `pluginVue.configs['flat/recommended-error']`, or run `eslint --max-warnings 0`.
- The essential bug-catching rules (`vue/no-mutating-props`, `vue/require-v-for-key`, `vue/no-use-v-if-with-v-for`, `vue/multi-word-component-names`, the after-await rules) are already errors in `flat/essential`. Add the rules below, which aren't:

```js
// eslint.config.js, after ...pluginVue.configs['flat/recommended-error']
{
  rules: {
    'vue/block-lang': ['error', { script: { lang: 'ts' } }],
    'vue/component-api-style': ['error', ['script-setup']],
    'vue/define-macros-order': ['error', { order: ['defineOptions', 'defineModel', 'defineProps', 'defineEmits', 'defineSlots'], defineExposeLast: true }],
    'vue/no-import-compiler-macros': 'error',
    'vue/no-setup-props-reactivity-loss': 'error',
    'vue/no-ref-object-reactivity-loss': 'error',
    'vue/require-typed-ref': 'error',
    'vue/require-explicit-slots': 'error',
    'vue/no-restricted-call-after-await': ['error', { module: 'vue-router', path: ['useRoute', 'useRouter'] } /* + i18n, stores, your composables; checks setup() only */],
    'vue/no-unused-properties': ['error', { groups: ['props'] }],
    'vue/no-v-html': 'error',
    'vue/no-template-target-blank': 'error',
    'no-console': 'error',                      // allowed only in the logging adapter
    'vue/require-default-prop': 'off',          // TS projects: optional props are intentionally undefined
    // Vue ≥ 3.5 only:
    'vue/prefer-use-template-ref': 'error',
    'vue/define-props-destructuring': 'error',
  },
}
```

- `vue/no-watch-after-await`, `vue/no-lifecycle-after-await` and `vue/no-restricted-call-after-await` all check only `setup()` functions. No lint rule catches a composable, store or `inject` call after an `await` inside another composable, so review for it. (In `<script setup>`, top-level `await` is legal and the compiler restores the instance.)
- `vue/no-unsupported-features` doesn't know 3.5 APIs, so it doesn't replace the version check in `SKILL.md`.
- More worth considering: `vue/html-button-has-type`, `vue/prefer-single-event-payload`, `vue/no-shadow-native-events`, `vue/no-root-v-if`, `vue/max-template-depth` (`{ maxDepth: 5 }`), `vue/no-undef-properties`, `vue/no-restricted-component-options` (`'mixins', 'extends'`).
- TypeScript: `@vue/eslint-config-typescript` ≥ 14.9 wraps typescript-eslint for `.vue` files: `export default withVueTs(pluginVue.configs['flat/recommended-error'], vueTsConfigs.recommendedTypeChecked, { rules: … })` (`defineConfigWithVueTs` and `configureVueProject` still work; `npx @vue/eslint-config-typescript migrate-to-with-vue-ts` converts). Type-aware linting is slower; start from `recommendedTypeChecked` rather than hand-picking rules, and pass `{ rootDir }` in monorepos. Add as errors: `@typescript-eslint/no-explicit-any`, the `no-unsafe-*` family, `switch-exhaustiveness-check`, `no-floating-promises`, `no-misused-promises`, `explicit-module-boundary-types`, `only-throw-error`, `no-unnecessary-condition`, `no-unnecessary-type-assertion`, `ban-ts-comment` (`{ 'ts-ignore': true }`), `consistent-type-definitions`, `no-deprecated` (cheap early warning before a framework upgrade). Don't add `consistent-type-imports`: `verbatimModuleSyntax` already enforces `import type`, and the rule's docs say the two conflict. Large codebases often switch these off; enable them with a baseline instead. Vue-side TypeScript rules: `vue/define-props-declaration` (`type-based`), `vue/define-emits-declaration` (`type-literal`), `vue/require-typed-object-prop`, `vue/no-required-prop-with-default`. Why each rule → [typescript](typescript.md).
- Enforce import direction (`eslint-plugin-boundaries`, `no-restricted-imports`, or dependency-cruiser); see [architecture](architecture.md).
- Encode team conventions as small, in-repo custom rules. A lint rule steers every contributor, agents included, more reliably than a document, and a 30-line rule is normal. Many need only `no-restricted-syntax`; for example, banning `as Error` on caught values: `{ selector: "TSAsExpression > TSTypeReference > Identifier.typeName[name='Error']", message: 'Narrow with instanceof or convert with toError().' }`.
- When a rule has many existing violations, commit a baseline of current offenders so only new code fails, then burn it down.
- Disable rules only for one line (`eslint-disable-next-line rule -- reason`), never file-wide in new files.
- With file-based routing and no auto-imports: add `vue-router/auto-routes` to `import/core-modules` and declare `definePage` as a global.

## Formatting [AF, VS, GL]

- **One formatting owner.** Either Prettier with ESLint's stylistic rules disabled (`@vue/eslint-config-prettier/skip-formatting` or `eslint-config-prettier`), or ESLint stylistic rules with no Prettier (`@antfu/eslint-config`). Keep whichever the project has.
- `flat/recommended-error` includes template formatting rules (`vue/max-attributes-per-line`, `vue/html-indent` and others). With Prettier, put the skip-formatting config **last** in `eslint.config.js` so those rules are off and the two tools don't fight.

## Type checking [docs, TS]

- `vue-tsc --build` (project references, what `create-vue` scaffolds) or `vue-tsc --noEmit` (single project) in CI; Nuxt: `nuxt typecheck`. Keep `typescript` on 6.x: `vue-tsc`, the Vue language server and typescript-eslint need the compiler API that TypeScript 7 doesn't ship. Set `vueCompilerOptions.strictTemplates: true` so templates reject unknown props, events and components. tsconfig, strictness flags, TypeScript 7 aliasing → [typescript](typescript.md).

## Logging [GL, OWASP]

- `no-console` is an error, except in the logging and monitoring adapter (one `eslint-disable` there). Committed code never calls `console.log`; tests fail on unexpected console output ([testing](testing.md)).
- Log and report through that one adapter, with structured context: feature, route name, release, and the request's correlation id when the API returns one. It scrubs secrets and personal data before anything leaves the browser ([security](security.md), [errors](errors.md)).

## CI and hooks [AF, GL]

- CI runs lint (zero warnings) + `vue-tsc` + tests with changed-line coverage + the bundle budget ([performance](performance.md)); lint-staged on pre-commit.
- Keep changes reviewable (around 500 lines).

## Dependencies [AF, GL, MO]

- Reach for VueUse before hand-writing browser or sensor composables; check `@vueuse/core` is in `package.json` first and propose it if not (see [vueuse-mapping](vueuse-mapping.md)).
- Apps are ESM: `"type": "module"`. Publish internal and shared packages as ESM-only.
- In pnpm monorepos, pin shared versions once in `pnpm-workspace.yaml` catalogs (`"vue": "catalog:"`).
- Commit the lockfile; install with `pnpm install --frozen-lockfile` (or `npm ci`) in CI.
- Don't publish stable internal packages at `0.x`.
- Patch a dependency (`pnpm patch`) only as a last resort, with a comment giving the reason, the upstream issue and when to remove it, plus a test proving the patch works.
- `pnpm audit --audit-level=high --prod` (or `npm audit --audit-level=high`) in CI; without a level, pnpm fails on `low` and npm on any finding, and the check gets ignored. Stay near the latest versions, after a short cooldown (`minimumReleaseAge`). Install scripts, cooldowns, CI hardening, publishing and SRI → [supply chain](supply-chain.md).

## Environment [docs, VS]

- Only `VITE_`-prefixed variables reach client code, via `import.meta.env`. They're public. Type them by augmenting `ImportMetaEnv` in `env.d.ts`.
- Production builds strip dev warnings and devtools; make sure `process.env.NODE_ENV` is `'production'` (Vite does this).

## Component workbench [CB]

- A story or playground per shared component (Storybook, Histoire) gives an isolated place to reproduce and review states, and a target for a11y checks.
