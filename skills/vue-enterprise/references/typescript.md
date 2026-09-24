# TypeScript

Source tags: [docs] Vue, Pinia, Pinia Colada, Vue Router, Vue language tools · [TS] TypeScript docs, release notes, tsconfig reference · [TE] typescript-eslint · [MP] Matt Pocock / Total TypeScript · [ET] Effective TypeScript · [AF] Anthony Fu / VueUse · [GL] GitLab · [CB] open-source codebases (Directus, Vikunja, n8n, Elk, Hoppscotch, NocoDB, Nuxt UI, Element Plus, Vuetify, PrimeVue, Reka UI, shadcn-vue, VueUse, Pinia, Vue Router, Pinia Colada). Every snippet here type-checks under `vue-tsc` 3.3 with `strictTemplates` against Vue 3.5.43.

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
| `erasableSyntaxOnly` | On for apps | Forbids `enum`, runtime `namespace`, parameter properties, `import x = require()`; matches the conventions below and Node's type stripping |
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

## Typing components [docs, CB]

- **Props:** `defineProps<Props>()`. Export the interface from a plain `<script lang="ts">` block in the same SFC or from a sibling `types.ts`; pick one per project. Consumers import `{ type InvoiceTableProps }` from the component. Imported types, intersections and `Omit`/`Pick` work (3.3+); a conditional type is fine for one prop, not for the whole object.
- Type-based props generate runtime validators in dev builds only; production compiles them to a name list. Runtime `defineProps({ status: { type: String as PropType<Status>, validator } })` is the tool when you need a runtime `validator`, or when a component library composes prop sets across factories. Libraries keep runtime props by design; in app code, type-based is the default.
- Native-element wrappers and foreign hand-written types: `interface Props extends /* @vue-ignore */ ButtonHTMLAttributes { … }`, so the compiler skips runtime validators it can't derive. Pair with `inheritAttrs: false` + `v-bind="$attrs"` (see [components](components.md)).
- Defaults: Vue ≥ 3.5 destructure (`const { size = 'md' } = defineProps<Props>()`), plain values for arrays and objects; below 3.5, `withDefaults` with factories. On 3.5+ both are correct; pick one per project and enforce it with `vue/define-props-destructuring`.
- Array and object props are `readonly`: `items: readonly Invoice[]`. A child then can't `push` into the parent's array, which is the "don't mutate what you don't own" rule enforced by the compiler. [ET]
- A prop that takes a known set but must stay open: `variant?: 'primary' | 'ghost' | (string & {})` keeps autocomplete and accepts other strings.
- A prop that takes a component: `import type { Component } from 'vue'`; `as?: string | Component`.
- Multi-type boolean props cast by order (`[Boolean, String]` bare attribute → `true`; `[String, Boolean]` → `""`); see [components](components.md).
- **Emits:** `defineEmits<{ pick: [item: Invoice]; close: [] }>()` (named tuples, 3.3+; `vue/define-emits-declaration: type-literal`). The runtime object form (`defineEmits({ click: (e: MouseEvent) => e instanceof MouseEvent })`) exists for payload validation in public library APIs; apps rarely need it.
- **Slots:** `defineSlots<{ row(props: { item: Invoice; index: number }): unknown; empty?(): unknown }>()`; optional slots get `?`. Return `unknown`, not the docs' `any`, so `no-explicit-any` stays clean.
- **v-model:** `defineModel<string>()` is `Ref<string | undefined>`; `{ required: true }` removes `undefined`; modifiers: `const [value, modifiers] = defineModel<string, 'trim' | 'lazy'>()`. Hand-written `modelValue` + `update:modelValue` stays acceptable only for controlled, multi-model library APIs.
- **Generic components** (3.3+), for tables, selects and lists typed by their items:

```vue
<script setup lang="ts" generic="T extends { id: string }">
const { items } = defineProps<{ items: readonly T[] }>()
const emit = defineEmits<{ pick: [item: T] }>()
defineSlots<{ row(props: { item: T; index: number }): unknown }>()
defineExpose({ scrollTo: (id: string) => items.findIndex((i) => i.id === id) })
</script>
```

  `T` flows into the slot props and the event payload at every call site. Real constraints are usually unions or literal types (`T extends string | string[]`, `Type extends 'text' | 'number' = 'text'`); an object shape is fine when the component keys by it. When inference can't pick `T`, pin it at the call site with a template comment: `<!-- @vue-generic {Invoice} -->` above the tag. Reach for a generic component when a second item type appears, not before.
- **Template refs:** `useTemplateRef('input')` (3.5, language tools ≥ 2.1) infers the element or component type for a static key. Non-generic component: `useTemplateRef<InstanceType<typeof InvoiceDialog>>('dialog')`. Generic component: `InstanceType` doesn't work, use `ComponentExposed<typeof DataTable>` from `vue-component-type-helpers`. Any component: `ComponentPublicInstance`. Refs are `null` until mounted.
- `defineExpose` before any `await`, and expose the minimum. To hand out a DOM element, expose `toRef(() => root.value?.$el as HTMLElement)` rather than the child instance.
- Exported shared components also export their instance type: `export type InvoiceTableInstance = InstanceType<typeof InvoiceTable>`.
- JSDoc every exported prop, emit and slot (`/** Position of the icon. @defaultValue 'left' */`). It shows on hover in consumers and feeds `vue-component-meta` for docs.
- TSX (only if the project uses it): `jsx: "preserve"` + `jsxImportSource: "vue"`; Vue 3.4 stopped registering a global `JSX` namespace. `FunctionalComponent<Props, Emits, Slots>` for functional components; runtime `props`/`emits` must still be attached.
- Template expressions don't get `<script>` narrowing: a `string | number` prop still needs a `computed` (preferred) or an inline cast in the template.

## Typing state and context [docs, CB]

- `ref<Invoice | null>(null)`; `ref<number>()` is `Ref<number | undefined>`; `vue/require-typed-ref` forbids a bare `ref()` that would be `Ref<any>`. `reactive`: annotate the variable (`const form: Form = reactive({…})`), never the generic. `computed<T>()` only when the getter's inferred type is wider than intended.
- DOM events: `(e: Event) => (e.target as HTMLInputElement).value`, or a typed handler prop.
- `InjectionKey<T>` for every provide/inject key. Wrap required context in a `createContext<T>(name)` helper that returns `[useX, provideX]` and throws a named error when the provider is missing; optional context injects with a default. VueUse `createInjectionState` is the same pair. `Symbol()` keys are the default; string keys cast to `InjectionKey<T>` are legal but collide.
- **Pinia:** setup stores infer everything from what they return; annotate empty initial values (`ref<Invoice[]>([])`). Option-store getters that read another getter through `this` need an explicit return type, because Pinia types getter returns as `any` until annotated. Plugins augment three different interfaces: `PiniaCustomProperties<Id, S, G, A>` for new store members, `PiniaCustomStateProperties<S>` for new state, `DefineStoreOptionsBase<S, Store>` for new `defineStore` options; keep the generic names exactly as Pinia declares them.
- **Pinia Colada:** augment `TypesConfig` in `@pinia/colada` with `defaultError`, `queryMeta` and `mutationMeta` once (see [server data](server-data.md)); every `useQuery` then infers `error` and `meta`. `state` is a discriminated union on `status`. `defineQueryOptions` tags its `key` with the data type, so `queryCache.getQueryData(invoiceByIdQuery(id).key)` is typed without a generic; a plain key from the key factory returns `unknown`.
- **Vue Router:** augment `RouteMeta` in `vue-router` (`requiresAuth?: boolean`, `layout?: …`). Typed routes come from `TypesConfig.RouteNamedMap`: generated with file-based routing (commit `typed-router.d.ts`), or hand-written `RouteRecordInfo<Name, Path, RawParams, Params, Children>` entries for a small manual route table. A bare `useRoute()` is typed only inside page components and only with the `vue-router/volar/sfc-typed-router` plugin; elsewhere pass the path: `useRoute('/invoices/[id]')`.
- **Globals** (`$fmt`, globally registered components, directives) augment `ComponentCustomProperties`, `GlobalComponents`, `GlobalDirectives` under `declare module 'vue'`, in a file that is a module (`export {}`) and is included by the tsconfig. Augment `'vue'`, not `'@vue/runtime-core'`: verified under pnpm, the latter creates an unrelated module and the template checker never sees it. Nuxt plugins also augment `NuxtApp` in `'#app'`. Prefer `app.provide` + a typed `useX()` over globals (see [architecture](architecture.md)).
- vue-i18n: augment `DefineLocaleMessage`, `DefineDateTimeFormat` and `DefineNumberFormat` for typed keys (JSON messages only, not `<i18n>` blocks); see [i18n](i18n.md).
- `:style` objects accept custom properties (`{ '--accent': color }`) out of the box; no `CSSProperties` augmentation is needed on Vue 3.3+.

## Boundaries [docs, TS, CB]

- **Where wire types come from**, in order of preference: a generated client from the API contract (`openapi-typescript` + `openapi-fetch`, `@hey-api/openapi-ts`, Orval; GraphQL codegen `client` preset; oRPC or tRPC when the backend is TypeScript in the same repo), then a first-party SDK or types package, then hand-written interfaces for a small API. Commit generated output or regenerate in CI with a drift check; exclude it from lint.
- `await res.json()` is `any`. A generated client types what the contract says, not what arrived. Parse with a schema where data is untrusted or drifts: user input and forms, route params and query strings, storage, `import.meta.env`, third-party APIs, webhooks, imports. Responses from your own API may trust its generated types; validate every response when the API isn't yours.
- Use a Standard Schema library (Zod 4, Valibot 1, ArkType 2) so forms, env and router helpers accept any of them; Zod for ecosystem breadth, Valibot when bundle size binds. Infer the type from the schema (`z.infer`; `z.input` vs `z.output` once a `.transform()` or codec exists). `z.coerce.number().int().positive().catch(1)` for a page param; `safeParse` for storage, and treat a failure as absent (the shape changed since it was written). Own the `Date` ↔ `YYYY-MM-DD` conversion in one codec, not in casts.
- Validate `import.meta.env` once at startup into an exported typed `env`; nothing else reads `import.meta.env` (a schema or `@t3-oss/env-core`).
- `catch (e)` is `unknown`: `e instanceof ApiError` before reading fields, `toError(e)` ([errors](errors.md)) when you must have an `Error`; never `e as Error`. Error classes set `override readonly name = 'ApiError'` explicitly, because minifiers rename classes and `.name` matching then breaks; match with `instanceof`. `throw` only `Error` subclasses (`@typescript-eslint/only-throw-error`). `Result<T, E>` types (neverthrow, fp-ts) are a project-wide decision, not a default; see [errors](errors.md).

## Conventions [TS, TE, MP, ET, GL, CB]

- Model view state as a discriminated union (`{ status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T }`), a union of interfaces rather than an interface of optional fields [ET]. Switch on the tag and end with `default: { const never: never = state; return never }`; `@typescript-eslint/switch-exhaustiveness-check` automates it.
- No `enum`: `export const InvoiceStatus = { Draft: 'draft', Sent: 'sent' } as const; export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]`, or `(typeof STATUSES)[number]` over an `as const` array. Enums are nominal, numeric ones accept any number, and `erasableSyntaxOnly` rejects them [MP, TS].
- `satisfies` where a value must match a type without losing its literal shape: query-key factories, route tables, config objects, message maps (`} as const satisfies Record<string, …>`). `as` widens or lies; a `: T` annotation widens.
- Branded ids when two ids are both strings and swapping them compiles: `type InvoiceId = Brand<string, 'InvoiceId'>` with `type Brand<T, N extends string> = T & { readonly [brand]: N }` over a `unique symbol`; cast once where the id enters (parser, API client) and never again [MP].
- `interface` for new object shapes; `type` for unions, brands and transforms (`type InvoicePatch = Partial<Omit<Invoice, 'id'>>`), never a hand-copied duplicate. ⚖ Total TypeScript prefers `type` by default because same-name interfaces silently merge; GitLab and the TypeScript team prefer `interface`. Keep `interface`, enforce one style with `consistent-type-definitions`, and treat an accidental duplicate declaration as the bug it is.
- Explicit return types on exported functions and composables (`explicit-module-boundary-types`); let inference work inside. Extract inline types that appear twice into a named type.
- Add a type parameter when the output type depends on an input type (`useFetch<T>`, `useStorage<T>`); otherwise take the concrete type or `unknown`. `<const T extends readonly string[]>` keeps literal tuples without `as const` at call sites; `NoInfer<T>` on a default parameter stops it from widening the inference.
- `unknown` over `any`; narrow with type predicates (`function isInvoice(x: unknown): x is Invoice`) and `in`/`instanceof`. The sanctioned `any` is one line with `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason` and a test; `@ts-expect-error` with a reason, never `@ts-ignore`. No non-null `!` outside tests. New code doesn't add to existing `any` debt: rules are errors with a committed baseline (see [tooling](tooling.md)).
- Lookups: `Record<Status, string>` when every key exists, `Partial<Record<…>>` when not, `Map` when keys come and go at runtime. A bare index signature says nothing about which keys exist [ET].
- Type-only imports use `import type` / `import { type X }` (`verbatimModuleSyntax` enforces it). Don't also enable `consistent-type-imports`; its docs say the two conflict.
- `@typescript-eslint/no-floating-promises` and `no-misused-promises`: an `async` handler passed to `@click` or `watch` must not lose its rejection; `void promise` marks the intentional cases.
- Third-party code without types: a `declare module 'lib'` in `src/types/shims.d.ts`, typed as far as you use it, or a thin typed wrapper component (`interface Props extends /* @vue-ignore */ LibProps {}`). Augmentation can extend existing declarations, not add new default exports.
- Legacy JS: JSDoc (`@param {string} config.path`, `@returns`, `@type {import('./x').T}`) gives editor inference with no build change [GL].
- Shared and published packages: `@vue/tsconfig/tsconfig.lib.json` (`skipLibCheck: false`, `noUncheckedIndexedAccess`), `isolatedDeclarations`, exported `UseXOptions`/`UseXReturn` interfaces, `MaybeRefOrGetter<T>` from `vue` for inputs (VueUse deprecated its own copy), precisely typed overloads over one loose implementation signature, and `declare module` hooks (`TypesConfig`-style) when consumers must widen your types [AF, CB].
- Type tests (`*.test-d.ts` with `expectTypeOf`, run by `vitest --typecheck`) for shared packages, generic components and augmentations. Apps rarely need them.

## Testing types [docs, CB]

- Typed mocks (`vi.fn<(id: string) => Promise<Invoice | null>>()`, `vi.mocked`) and typed MSW handlers (`http.get<Params, RequestBody, ResponseBody>`) → [testing](testing.md).
- `mount(InvoiceList).vm` sees only what `defineExpose` exposed; expose more rather than casting `vm`. `wrapper.findComponent<typeof Child>(Child)` returns a typed wrapper.
- `tsconfig.vitest.json` extends the app config with `types: ["node", "jsdom"]`; tests type-check under `vue-tsc --build` like app code.
