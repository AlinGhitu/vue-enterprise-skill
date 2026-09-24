# Architecture

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab frontend guide · [CB] open-source codebases (Elk, Nuxt UI, Element Plus, Directus, Vikunja).

## Folder structure grows in stages [VS, MO, CB]

- **Flat** (`components/ composables/ stores/ views/`) while boundaries are unclear. First step out: add only `components/base/` for generic building blocks.
- **Feature folders** when a second domain appears and the flat layout starts to hurt. Around 20–30 components is a signal to consider it, not a trigger. ⚖ Oberlehner stays flat much longer; premature domain boundaries are worse than a big folder.

```
src/
  app/            bootstrap: router, plugins, providers — nothing else
  features/
    billing/
      components/   composables/   api/   queries.ts   mutations.ts
      stores/       views/         types.ts
  shared/
    ui/           Base*/App* primitives, no business logic
    stores/       app-wide stores (auth, session, preferences)
    composables/  lib/   types/   api/
  pages/          only with file-based routing: thin files delegating to features
```

- **Monorepo** (pnpm workspaces) only with several deployables sharing code. Nuxt Layers are the lighter option in Nuxt. Rules in the next section.

## Monorepo and shared packages [docs, GL, CB]

```
apps/
  billing-portal/   admin/          each a Vue app with the src/ layout above
packages/
  ui/               design-system components and tokens
  api-client/       generated from the API contract
  utils/            pure functions, no Vue
  tsconfig/         eslint-config/  shared tool config
```

- Apps depend on packages; packages never import an app, and a lower package never imports a higher one (`ui` may use `utils`, not the reverse). Enforce this with the same boundary lint as inside an app.
- A package's public API is its `exports` map. Deep imports (`@org/ui/src/internal/x`) are a lint error.
- Features stay inside their app. A feature moves into a package only when a second app needs it: the promotion rule, across packages. Don't create packages speculatively.
- Internal packages that only this repo uses are consumed as source (`"exports": { ".": "./src/index.ts" }`), so the app's Vite config compiles them and there's no build step to drift. Packages published for other repos ship built ESM with `.d.ts` and CSS, and are versioned with Changesets.
- One version per dependency across the repo, pinned in pnpm catalogs (`"vue": "catalog:"`); see [tooling](tooling.md).
- Type-check with TypeScript project references across packages (`vue-tsc --build`). Cache lint, type-check, test and build per package with the repo's task runner (Turborepo or Nx), and run only what a change affects in CI.
- A breaking change to a shared package updates every consumer in the same change (see "Wrap what you don't own").

## Dependency direction [GL, MO]

- Dependencies point downward: `app/` → `features/` → `shared/`. `shared/` never imports a feature. Nothing imports `app/` or an entry file.
- A generic component that needs specific content takes a **slot** instead of importing it.
- **Promotion rule:** code used by one feature lives in it; when a second feature needs it, move it to `shared/`.
- **Demotion rule:** shared code that only one feature uses moves back into that feature.
- Before merging two "identical" constants into `shared/`, check they mean the same thing.
- **Isolation:** features don't import each other's internals. Cross-feature needs go through `shared/`, a shared store, a route, or an event. ⚖ GitLab allows feature→feature imports in its monolith; the hard invariant everyone agrees on is that `shared/` stays extractable.
- Features that keep importing each other or keep changing together have the boundary in the wrong place. In order of preference: expose a small public API from the feature (an `index.ts` that other features may import, internals off-limits); extract the shared capability into `shared/`; merge the features. Restructuring folders is normal refactoring, not a failure.
- Enforce the direction mechanically: `eslint-plugin-boundaries`, `no-restricted-imports`, or dependency-cruiser in CI. When introducing a rule into an existing codebase, commit a baseline file of current violations so only new code fails, then burn it down.

## Where things live [docs, GL, CB]

- Server-state definitions live in the feature: `queries.ts` (key factory + `defineQueryOptions`) and `mutations.ts` next to `api/`. See [server data](server-data.md).
- Feature stores live in the feature. Stores every feature reads (auth, session, preferences) are shared code and live in `shared/stores/`.
- Routes: with file-based routing (Vue Router 5), `src/pages/` files stay thin and render a feature's controller component. With manual routes, each feature exports `routes.ts` and the root router concatenates them. See [routing](routing.md).
- API calls live in `features/<x>/api/` (or `shared/api/`) as typed functions. Components never hand-build URLs or call `fetch` directly.

## Naming [docs style guide, VS, GL, CB]

- Multi-word component names, except the root `App`. A consistent library prefix (`Base`, `App`, or a design-system prefix like `V`/`El`/`U`) satisfies this.
- `Base`/`App` prefix for app-wide presentational primitives.
- Children that only make sense inside a parent carry the parent's name (`TodoList` → `TodoListItem`).
- Order words from general to specific (`SearchInputQuery`, not `QuerySearchInput`).
- Full words, no abbreviations.
- Filenames: PascalCase or kebab-case, one of them consistently (the style guide allows either). Tags in SFC templates are PascalCase.
- A component in a generic filename (`index.vue`, `Form.vue`) gets an explicit, context-prefixed name: `defineOptions({ name: 'BillingInvoiceForm' })`. Otherwise devtools, warnings, `<KeepAlive include>` and `findComponent({ name })` see collisions.
- Composables `useX.ts`; stores `useXStore`.
- Prefer named exports (SFCs excepted).
- Functions with more than three parameters take one options object.

## Wrap what you don't own [VS, MT, MO]

- **Services** (HTTP client, analytics, payments, auth, monitoring, feature flags): always behind an adapter. Components import `useAnalytics()` or `api.invoices.list()`, never the vendor SDK. Swapping a provider touches one file, and tests mock one seam.
- **Libraries:** wrap case by case — the ones likely to change or used in many places. When wrapping, re-export only the subset the app may use (`export { get, post }`, not `export * from 'axios'`), shaped to project conventions.
- Design an adapter from what the app needs, after comparing 2–3 providers.
- Awkward UI libraries (charts, editors, maps) go behind one wrapper component.
- Whoever makes a breaking change to shared code updates every consumer.

## Dependency injection [MO, GL, docs]

- Inject only what has side effects or varies (API clients, services, flags, config). Import pure helpers directly; injecting them just forces every test to mock them.
- Keep injection keys and the wiring of concrete services in one composition-root module (`app/services.ts`), not in each service's implementation file. Consumers then depend on the key, not the implementation.
- Don't hold state in instances of your own JS classes. Use plain objects plus composables or stores, and keep business logic in pure modules. (Third-party class instances are fine, wrapped in `shallowRef` or `markRaw`.)
- No module-level mutable singletons, even in client-only apps. They leak state between tests, have no owner, and get duplicated when two bundles load the module. Create state per app instance (Pinia, `app.provide`). A truly global concern (logging) is the exception.
- Importing a module is side-effect free: no requests, DOM work or timers at the top level of a module that exports anything.

## Bootstrap [docs, GL]

- Keep entry files (`main.ts`) thin: read config, create the app, install plugins, provide services, mount. No logic.
- Read server-injected config (`window.__CONFIG__`, `data-*` attributes, meta tags) once at init. Parse it explicitly (`data-*` values are always strings), and pass it down with `app.provide` or root props. Components never read globals or query the DOM for config.
- Configure the app completely (`app.use`, `app.provide`, `app.config.errorHandler`) before `mount()`, which is called once.
- Plugins that start app-level listeners or timers clean up with `app.onUnmount(cb)` (3.5).
- Prefer `app.provide` + a typed `useX()` over `app.config.globalProperties`.
- Avoid mixins (docs: not recommended). Composables replace them.
- One Vue app per page. Extend the existing app rather than mounting a second one next to it. If several apps must coexist (micro-frontends, islands), give each its own `app.config.idPrefix` (3.5) so `useId()` values don't collide.

## Imports [AF, GL, CB]

- Greenfield Vite apps: prefer explicit imports over auto-imports, so every symbol is traceable. Nuxt apps keep Nuxt's auto-imports ([nuxt](nuxt.md)). Existing projects: keep what's configured, including globally registered base components.
- Use the path aliases the project already has.

## Design-system layers [MO, CB]

For apps or libraries serving several design systems or brands:

1. Unstyled, accessible primitives (Reka UI, Headless UI).
2. Styled primitives per design system (`BaseButton`, `BaseDialog`).
3. Domain components (`InvoiceCard`).

Each layer imports only from the layers below it. For a single design system, layers 1 and 2 collapse. Check the design-system library before writing a new primitive. Style through semantic tokens (`--color-surface`, `text-muted`), never raw palette values, so theming and dark mode stay one-file changes.
