# Routing

Source tags: [docs] router.vuejs.org / vuejs.org / Pinia Colada · [VS] Vue School · [GL] GitLab · [CB] open-source codebases.

## Version [docs]

- **Vue Router 5** is current. Without file-based routing, upgrading from 4 is drop-in; do that rather than adding the deprecated, archived `unplugin-vue-router`.
- Typed file-based routing is built into v5 and stable (`vue-router/vite`, `vue-router/auto-routes`).
- Don't adopt `experimental_createRouter` or param parsers (`[id=int].vue`): the docs mark them not production-ready.

## Route definitions [docs, VS, GL]

- **File-based (preferred for new apps, typed automatically):** add `VueRouter()` from `vue-router/vite` **before** `vue()` in the Vite plugins, import `routes` from `vue-router/auto-routes`, and commit the generated route-map `.d.ts`. `useRoute('/invoices/[id]')` gives typed params; add the Volar plugins `vue-router/volar/sfc-typed-router` and `vue-router/volar/sfc-route-blocks` so a bare `useRoute()` inside a page component is typed for that page too. Keep `src/pages/` files thin: they render a feature's controller component.
- Page meta goes in `definePage({ meta })`. It's extracted at build time, so it can't reference variables or hold `beforeEnter`; use a global guard driven by `meta`. Route groups (`(admin)/`) organize files without adding a URL segment; to give a whole group shared meta, add it in the plugin's `beforeWriteFiles()` hook (`addToMeta`).
- **Manual routes:** each feature exports `routes.ts`; the root router concatenates them. Type them with a `RouteNamedMap` (≥ 4.4) and augment `RouteMeta`.
- Lazy-load every route except the landing view: `component: () => import('./views/InvoiceList.vue')`. **Don't** use `defineAsyncComponent` for route components.
- Named routes: navigate by name (`{ name: 'invoice', params: { id } }`), never by building path strings.
- A final catch-all route (`/:pathMatch(.*)*`) renders NotFound. History mode needs the server to fall back to `index.html` for unknown paths.
- Route HMR with file-based routing: `if (import.meta.hot) handleHotUpdate(router)`.
- Group chunks with Vite `manualChunks` only when profiling shows a need.

## Layouts [VS]

- Choose the layout from `route.meta.layout` through a lookup table. Nested routes with a layout parent only when the section shell must keep state between child routes.
- Nuxt: `definePageMeta({ layout })`.

## Guards [docs]

- Return a value instead of calling `next`: `false` cancels, a route location redirects, nothing (or `true`) continues. `async` guards are awaited. Legacy guards using `next` must call it exactly once on every path.
- Global auth check in `router.beforeEach`, driven by `to.meta.requiresAuth`, not scattered `beforeEnter` hooks.
- `beforeEnter` runs only when entering the route, not when only params, query or hash change.
- Call `useAuthStore()` inside the guard, not at module top level. `inject()` also works in guards (Vue 3.3+).
- Unsaved-changes prompts go in `onBeforeRouteLeave` in the form's component.
- Register `router.onError` and report from it: failed lazy-route chunk loads (often right after a deploy) and navigation errors surface there, not in component error boundaries.

## Loading data for a route [docs]

- **Parse params in the page, once.** Params arrive as strings (`string | string[]` on an untyped route) and may not match your id format. Read them through a typed route (`useRoute('/invoices/[id]')`); an untyped `route.params.id` is an index-signature read that `noPropertyAccessFromIndexSignature` rejects. The page parses them, renders NotFound for an invalid value, and passes a typed prop to the feature's controller component. `String(route.params.id)` is coercion, not parsing: it turns `['a', 'b']` into `'a,b'`.

```ts
// features/invoices/route-params.ts: adapt the pattern to your id format
export function parseInvoiceId(param: string | string[] | undefined): string | null {
  return typeof param === 'string' && /^[0-9a-f-]{36}$/i.test(param) ? param : null
}
```

```vue
<!-- src/pages/invoices/[id].vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { parseInvoiceId } from '@/features/invoices/route-params'
import InvoiceDetail from '@/features/invoices/components/InvoiceDetail.vue'
import NotFound from '@/shared/ui/NotFound.vue'

const route = useRoute('/invoices/[id]')   // typed: params.id is a string
const invoiceId = computed(() => parseInvoiceId(route.params.id))
</script>

<template>
  <NotFound v-if="invoiceId === null" />
  <InvoiceDetail v-else :invoice-id="invoiceId" />
</template>
```

- **With Pinia Colada** (default): the controller's query takes the parsed id through a key getter, `useQuery(() => invoiceByIdQuery(props.invoiceId))`. It refetches when the id changes, caches and dedupes, with no watcher.
- **Without a query library:** watch the specific param, never the whole route: `watch(() => route.params.id, load, { immediate: true })`, resetting loading and error state at the start of each load.
- A route component is reused when only its params change, so setup doesn't re-run. Anything derived from params must be `computed`, a query key getter, or watched.
- Parse query-string values the same way (`z.coerce.number().int().positive().catch(1)` for a page number; see [typescript](typescript.md)).
- Sync filter/sort/page state to the query string (`useRouteQuery` from `@vueuse/router`) so views are shareable and survive refresh.

## Data loaders (experimental) [docs]

Data loaders (`vue-router/experimental`) are **experimental**: the import path says so, and the RFC is still open. Use them only when the team explicitly accepts an experimental API. When adopted:

- Prefer `defineColadaLoader` from `vue-router/experimental/pinia-colada` (cache, SSR, no double fetch on hydration) over `defineBasicLoader` from `vue-router/experimental`. Install `app.use(DataLoaderPlugin, { router })` **before** `app.use(router)`.
- **Export** each loader from the page component that uses it; an unexported loader is never awaited by navigation.
- Inside a loader, read only from `to`, create no reactive effects, and call `inject()`/stores before the first `await`. Pass `signal` to fetches.
- Redirect or cancel with `reroute(location | false)`. Declare expected errors with `errors: [NotFoundError]` so they land in `error` instead of aborting navigation. Mark non-critical loaders `lazy: true`.
- Loader errors abort navigation and reach `router.onError`, not component boundaries.

Why not `<Suspense>` + top-level `await` for page data: it fetches nested routes sequentially, can't redirect or cancel navigation, has no cache or dedupe, and Suspense itself is experimental.

## Dialogs as routes [CB]

- Detail modals that should be linkable and close on Back render as a child route over the list. Closing navigates back; the list stays mounted underneath.

## Accessibility [docs]

- On route change, move focus to a skip link or the main heading, and update `document.title`. Screen readers don't announce SPA navigation on their own.

## Testing [GL, docs]

- Navigation is async: `await router.push(…)` and `await router.isReady()` before asserting. Push a route that exists before mounting. Setting `window.location` does nothing.
