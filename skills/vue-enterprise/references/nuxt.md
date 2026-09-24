# Nuxt

Source tags: [docs] nuxt.com (4.x docs), Pinia and Pinia Colada docs · [CB] open-source codebases.

For Nuxt 4. The rest of this skill applies to Nuxt apps too; this file covers only what Nuxt changes.

## Layout [docs]

- Nuxt 4's source directory is `app/` (`app/pages`, `app/components`, `app/composables`, `app/layouts`, `app/middleware`, `app/plugins`, `app/error.vue`); server code lives in `server/` at the root. Nuxt's `app/` is the whole client source, not the bootstrap folder of [architecture](architecture.md): bootstrap code goes in `app/plugins/`.
- Features live in `app/features/<name>/` with the usual structure. Nuxt's own directories stay thin: a page renders a feature's controller component, and a plugin wires services.
- Split a large app, or share code between Nuxt apps, with layers (`extends: ['../base']`) before reaching for a monorepo package.

## Auto-imports [docs]

- Nuxt auto-imports Vue APIs, its own composables, and what's in `composables/`, `utils/` and `components/`. Keep that in Nuxt projects; the "prefer explicit imports" rule is for plain Vite apps.
- `app/features/` isn't scanned, so feature code is imported explicitly, which keeps feature boundaries visible in the imports. Don't add feature folders to the scanned directories.
- `imports: { scan: false }` stops scanning your directories; Nuxt's and modules' auto-imports stay on.

## Data [docs]

- `useFetch`/`useAsyncData` for data one page loads per navigation. Pinia Colada (`@pinia/colada-nuxt`, which needs `@pinia/nuxt`) for data shared between views, cached, or mutated ([server data](server-data.md)).
- Give `useAsyncData` an explicit, namespaced key (`'invoices:list'`). `useFetch` generates one from the URL and options.
- `data` is a shallow ref by default (`deep: false`): replace it, don't mutate into it.
- `useFetch` and `useAsyncData` run in setup, plugins and route middleware only. In event handlers and mutations, call `$fetch`.
- On the server, `useFetch` with a relative URL forwards the user's cookies and headers; plain `$fetch` doesn't. When you call your own API with `$fetch` during SSR, use `useRequestFetch()`. Never forward them to third-party hosts ([security](security.md)).

## State [docs]

- `useState('namespace:key', () => initial)` for small SSR-safe shared values; Pinia via `@pinia/nuxt` for anything larger. Never module-level refs: on the server they're shared between all requests.
- `callOnce` for one-time initialization that must not run again during hydration (loading config into a store).
- Branch on `import.meta.client` / `import.meta.server`. Browser-only widgets go in `<ClientOnly>`; browser APIs in `onMounted`.

## Routing and middleware [docs]

- Page meta with `definePageMeta({ layout, middleware })`. App-wide checks go in a global route middleware (`app/middleware/auth.global.ts`; the `.global` suffix runs it on every route change), driven by page meta.
- Route middleware decides what to display. Authorization is enforced by the server on every request ([security](security.md)).

## Server routes [docs]

- `server/api/*.ts` with `defineEventHandler`. Validate every input with a schema (`readValidatedBody`, `getValidatedQuery`, `getValidatedRouterParams`). Server routes are backend code: all of the backend rules in [security](security.md) apply.
- Server routes are the natural BFF: they hold the tokens, and the browser holds only a session cookie.

## Config and secrets [docs]

- Private keys at the top of `runtimeConfig` (server only, overridden by `NUXT_*` env vars); browser-visible values under `runtimeConfig.public` (`NUXT_PUBLIC_*`). The env var name must match the key exactly ([security](security.md)).

## Errors [docs]

- Throw `createError({ statusCode, statusMessage })`. A fatal error renders `error.vue`; leave it with `clearError({ redirect: '/' })`. `showError` triggers it from client code.
- `<NuxtErrorBoundary>` for risky subtrees instead of a hand-built boundary ([errors](errors.md)).

## Type checking and security [docs]

- `nuxt typecheck` in CI; it needs `vue-tsc` and `typescript` as dev dependencies, with the TypeScript 6.x constraint from [typescript](typescript.md). `.nuxt/` is generated and stays uncommitted.
- Nuxt-specific security (`nuxt-security`, runtime compiler off, route-rule caching, 2026 CVEs) is in [security](security.md).
