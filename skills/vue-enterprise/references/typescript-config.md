# TypeScript config

Source tags: [docs] Vue language tools · [TS] TypeScript docs, release notes, tsconfig reference · [CB] open-source codebases. Typing code → [typescript](typescript.md).

## Compiler and toolchain [TS, docs, CB]

- **Stay on TypeScript 6.x.** TypeScript 7.0 (July 2026, the native Go port) ships no compiler API, so `vue-tsc`, the Vue language server, and typescript-eslint cannot run on it; Microsoft's own advice is to keep such tools on 6.x until 7.1 ships a new API. `create-vue` pins `typescript: ~6.0.0`. If the repo adopts TypeScript 7 for its own `tsc`, the `typescript` package that Vue tooling resolves must still be the 6 API: alias it, `npm i -D typescript@npm:@typescript/typescript6` (`vue-tsc` resolves that alias), and install 7 under a second name for its compiler (`"@typescript/native": "npm:typescript@^7.0.2"`). `vue-tsc` 3.3 crashes on 7.0 and passes with the alias. Running 7's `tsgo` alongside for speed is fine; `vue-tsc` still owns the template check.
- TypeScript 6.0 (March 2026) flipped defaults: `strict: true`, `module: esnext`, `target: es2025`, `types: []`, `rootDir: .`, `noUncheckedSideEffectImports: true`. It deprecated `baseUrl`, `moduleResolution: node`/`classic`, `target: es5`, `downlevelIteration`, `module: amd|umd|system`; 7.0 removes them. `ignoreDeprecations: "6.0"` only buys time. `paths` no longer needs `baseUrl`.
- Vite only transpiles: type-check with `vue-tsc`. New projects: `vue-tsc --build` over project references (`create-vue` generates `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.vitest.json`, each with `tsBuildInfoFile` under `node_modules/.tmp`). Single project: `vue-tsc --noEmit`. Nuxt: `nuxt typecheck` in CI (Nuxt doesn't type-check on `dev`/`build` unless `typescript.typeCheck` is set).
- Editor: "Vue - Official" (Volar). It registers inside the built-in TS service, so there is no takeover mode and no `*.vue` shim file. WebStorm bundles the same plugin.
- Big repos: project references, `skipLibCheck: true` (app code), `NODE_OPTIONS=--max-old-space-size=8192` before `vue-tsc` when it runs out of memory. A legacy app that can't pass yet gates the directories that must (for example `services` and `auth`) while the rest burns down; say so in CI, and don't count a partial gate as "type-checked".

## tsconfig [docs, TS, CB]

- Extend `@vue/tsconfig/tsconfig.dom.json` (0.9.x, TS ≥ 5.8). It sets `strict`, `verbatimModuleSyntax` (which implies `isolatedModules`; don't set both), `moduleResolution: "bundler"`, `module: "ESNext"`, `moduleDetection: "force"`, `jsx: "preserve"` + `jsxImportSource: "vue"`, `noEmit`, `skipLibCheck`, `lib: ES2022 + DOM`, `types: []`. Config files (`vite.config.ts`, `eslint.config.js`) get their own project extending `@tsconfig/node24`; `@vue/tsconfig` no longer ships a node config. Large orgs wrap the base in their own shared tsconfig package; a hand-rolled config replicates the options above.
- Keep `types: []` and list what you need (`vite/client`, `node`, `jsdom`) per project. `paths` mirror the Vite aliases. `env.d.ts` holds `/// <reference types="vite/client" />` and the `ImportMetaEnv` interface for `VITE_*` keys.
- Beyond `strict`:

| Flag | Use | Why |
|---|---|---|
| `noUncheckedIndexedAccess` | New projects: on (`create-vue` default, `@vue/tsconfig/tsconfig.lib.json`, Pinia Colada). Existing: enable per directory or with a baseline | `arr[i]` and `record[key]` become `T \| undefined`; it's where lookup bugs hide. Retrofitting it is real work |
| `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` | On | Cheap; the last keeps index-signature reads visibly bracketed |
| `exactOptionalPropertyTypes` | New projects only | Distinguishes absent from `undefined`; breaks `{ ...obj, field: maybeUndefined }` and some library types; `@vue/tsconfig` leaves it off as "hard to land" |
| `erasableSyntaxOnly` | On for apps | Forbids `enum`, runtime `namespace`, parameter properties, `import x = require()`; matches the conventions in [typescript](typescript.md) and Node's type stripping |
| `isolatedDeclarations` | Published or shared packages only | Forces annotated exports so `.d.ts` emit is per file; pointless churn in app code |
| `useUnknownInCatchVariables` | Already on via `strict` | `catch (e)` is `unknown`; narrow before use |

- `vueCompilerOptions.strictTemplates: true` turns on `checkUnknownProps`, `checkUnknownEvents`, `checkUnknownComponents`, `checkUnknownDirectives` and `strictVModel`, so a template with an unknown prop, listener or component fails `vue-tsc`. Without it, a typo in `:disabld` passes. New projects turn it on; an existing app enables the four `checkUnknown*` flags one at a time. `strictTemplates` also rejects `data-*` attributes on elements, `data-testid` and `data-allow-mismatch` included, until they're declared once:

```ts
// src/types/vue.d.ts: declare data-* attributes for strictTemplates
declare module 'vue' {
  interface HTMLAttributes {
    [key: `data-${string}`]: string | number | boolean | undefined
  }
}
export {}
```

- Add `fallthroughAttributes: true` when wrappers forward `$attrs` to a child and consumers should see the child's attributes. Volar plugins (typed routes, i18n) go in `vueCompilerOptions.plugins`.
- Commit generated declaration files the type-checker needs at edit time (`typed-router.d.ts`, `components.d.ts`, `auto-imports.d.ts`, generated API clients). Nuxt's `.nuxt/` is regenerated by `nuxt prepare` and stays uncommitted.

