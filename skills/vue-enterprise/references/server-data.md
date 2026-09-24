# Server data

Source tags: [docs] official docs (Pinia Colada, Vue Router) · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

Server data is a cache with a lifecycle (stale, refetch, invalidate), not app state. This file assumes **Pinia Colada 1.x** (posva's query library for Vue, stable since 1.0; current releases need Vue ≥ 3.5.41, and Pinia 4 needs Colada ≥ 1.4.1). TanStack Query for Vue follows the same model with different defaults; use whichever the project has.

## One source of truth [GL, docs]

- Each piece of server data lives in exactly one place: the query cache. Never copy query results into a Pinia store or a local `ref` to "keep" them. Two copies drift apart.
- Pinia holds client state (session, UI, multi-step drafts); the query cache holds server state. They're used together, with that split kept strict. ⚖ GitLab says to pick one global store; the split above is the documented Pinia Colada model and avoids the two-sources problem GitLab warns about.
- Key cached entities by their stable server `id`, so an update to one entity reaches every view.

## Setup [docs]

- `app.use(pinia)` first, then `app.use(PiniaColada, { queryOptions, mutationOptions, plugins })`. App-wide policy (`staleTime`, `gcTime`, error hooks) goes here, not in each call.
- Defaults: `staleTime` 5 s, `gcTime` 5 min. (TanStack's `staleTime` default is 0.)
- `@pinia/colada-devtools` is a devDependency and stays out of production.
- Retries, polling and persistence come from plugins (`@pinia/colada-plugin-retry`, `-auto-refetch`, `-cache-persister`); once installed, they add per-query options such as `retry` and `autoRefetch`. The auto-refetch plugin is still pre-1.0. With the persister, exclude sensitive keys.

## Queries [docs, GL]

Define every shared query next to a key factory in `features/<x>/queries.ts`, never inline in components:

```ts
export const INVOICE_KEYS = {
  root: ['invoices'] as const,
  byId: (id: string) => [...INVOICE_KEYS.root, id] as const,
}
export const invoiceByIdQuery = defineQueryOptions((id: string) => ({
  key: INVOICE_KEYS.byId(id),
  query: () => api.invoices.get(id),
}))
// controller, given an already-parsed id prop (see routing): const { state } = useQuery(() => invoiceByIdQuery(props.invoiceId))
```

- The key holds **every** input the query reads. Pass a getter to `useQuery` so the key is reactive. A plain array is evaluated once and never refetches.
- Keys compare by value and type: `['doc', 2]` and `['doc', '2']` are different entries. Parse route params once in the page ([routing](routing.md)) so every key gets the same type. `undefined` fields in key objects are dropped; object key order doesn't matter; array order does.
- Override options per call site by spreading inside the getter: `useQuery(() => ({ ...listQuery, enabled: isOpen.value }))`. Pause with `enabled`, never by wrapping `useQuery` in an `if`.
- **Dependent queries:** when a query's input comes from another query, set `enabled: () => project.value != null` so it doesn't run once with `undefined`.
- Defer queries the UI doesn't need yet (a closed dropdown, an inactive tab) with `enabled`.
- The query function must **throw** on non-2xx responses. `fetch` doesn't, and Colada only treats a thrown or rejected value as an error.
- Render from `state`, a discriminated union on `status`, so TypeScript narrows `data` and `error`. `status` (`pending`/`success`/`error`) says whether there is data; `asyncStatus` (`idle`/`loading`) says whether a request is in flight.
- Tell **loading** (no data yet: skeleton) apart from **refetching** (stale data on screen: subtle indicator, content stays). A failed refetch keeps the old `data` and sets `error`: show a banner over the stale data, not a full error screen.
- `refresh()` respects `staleTime` and dedupes; use it by default. `refetch()` only for an explicit user "reload".
- There's no `select` option: derive with `computed`, or transform inside `query`. Colada stores data in `shallowRef` without structural sharing, so a watcher on `data` fires after every successful fetch.
- Several simultaneously mounted components that share a query **and** extra local state (a search box): use `defineQuery()`, not a plain composable, or each caller gets its own `search` ref while the query stays global. That state isn't SSR-serialized; put it in a store if SSR needs it.
- Never call `useQuery` inside a Pinia store (it would never stop). `useQueryCache()` works only in injection contexts (setup, stores, guards); capture it at setup time.

## Pagination and infinite lists [docs]

- Paginated: the page is part of the key; add `placeholderData: (prev) => prev` so the list doesn't blank between pages.
- Infinite scroll: `useInfiniteQuery`, with filters in the key and the cursor **not** in the key; `initialPageParam` + `getNextPageParam` (return `null` to stop); `maxPages` for long feeds.

## Mutations [docs, GL]

```ts
const queryCache = useQueryCache()
const { mutate, asyncStatus } = useMutation({
  mutation: (input: NewInvoice) => api.invoices.create(input),
  onSettled: () => queryCache.invalidateQueries({ key: INVOICE_KEYS.root }),
})
```

- Invalidate the affected keys in `onSettled`. `return` or `await` the invalidation when the button should stay busy until the list has refetched.
- `mutate()` from templates (errors land in `error` and the hooks). `mutateAsync()` only when the caller must `await` or `try/catch`.
- Reuse with `defineMutation()` (shared state) or `defineMutationOptions()` (typed options; Colada ≥ 1.2, otherwise pass the options inline).
- Update caches immutably: build new objects, never mutate cached data. `setQueriesData(filters, updater)` patches every list containing an entity. Never write reactive proxies into the cache; pass plain objects.
- Changed fields of an existing entity arrive through refetch or an id-keyed update; hand-edit list entries only when items are added or removed.

## Optimistic updates [docs, VS]

- **Prefer the UI approach** when the mutation sits next to the list: render the mutation's `variables` as a pending row while it runs, then await the invalidation. No rollback code.
- Cache surgery only when the mutation is far from the query: in `onMutate`, cancel in-flight queries for the key, snapshot the old data, write the optimistic data. In `onError`, roll back **only if the cache still holds your optimistic value** (another mutation or refetch may have replaced it). In `onSettled`, handle a context that's `undefined` because `onMutate` threw, then invalidate.
- Never optimistic for irreversible or financial actions.

## Errors [docs, CB]

- Cross-cutting error UX in one place: mutation errors in `mutationOptions.onError` at install time; query errors in `PiniaColadaQueryHooksPlugin({ onError })`, driven by per-query `meta: { errorMessage }`. Filter by error type rather than toasting every failure.
- Type errors and meta once by augmenting `TypesConfig` in `@pinia/colada` (`defaultError`, `queryMeta`).
- See [errors](errors.md) for mapping backend error codes to messages.

## Cache lifecycle [docs, CB]

- Prefetch on hover or before navigation: `await queryCache.refresh(queryCache.ensure(opts))`.
- On logout or user switch, clear the whole cache (and reset stores). To drop one entry, `cancel(entry)` then `remove(entry)`: `remove` alone lets an in-flight request write the data back.

## Polling and real-time [GL]

- Poll only while the tab is visible, and refetch when it becomes visible again. Let the server set the interval (a `Poll-Interval` header) and stop on errors; pair polling with ETag/304 on the server.
- Use push (WebSocket, SSE) only when updates must arrive within seconds or are very frequent. Push thin messages (ids only) and refetch through the normal query. Keep polling as the fallback for dropped connections. Batch bursts of ids into one debounced fetch.

## Without a query library [MO, VS]

- A composable returning `{ data, error, isLoading, reload }` using the async → sync pattern, with request cancellation ([composables](composables.md)).
- Deduplicate identical in-flight requests, and build cache keys deterministically (sorted keys or arrays of primitives, not `JSON.stringify` of objects).
- Refresh after writes centrally in the HTTP client (reads register by path; a non-GET refreshes matching reads), not by bubbling events up the tree. A query library's invalidation is the better version of this.

## SSR [docs]

- Nuxt: `@pinia/nuxt` + `@pinia/colada-nuxt`; Colada for shared, cached or mutated data, `useFetch`/`useAsyncData` for one-off page data.
- Custom SSR: install `PiniaColadaSSRNoGc()` on the server only and clear the cache after each render; serialize with `serializeQueryCache`/`hydrateQueryCache`. On the server `useQuery` awaits through `onServerPrefetch`; mark non-critical queries `enabled: !import.meta.env.SSR`.
