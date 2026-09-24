# Client state

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

This file covers state the client owns. Data fetched from a server is a cache: see [server data](server-data.md).

## Where state lives [MT, VS, MO, GL]

Keep **state distance** short: state sits at the lowest component above every consumer. The fewer components that *could* read or change a piece of state, the fewer places to look when it's wrong.

First classify it: **interaction state** (`isOpen`, `isSubmitting`, selection) or **data** (from the server or the page). Then escalate only as far as needed:

| Situation | Home |
|---|---|
| One component | local `ref` |
| Siblings | lift to the common parent; child A emits, parent updates, child B gets a prop |
| Deep prop chain through components that don't use the data | **slots**: the owner renders the deep child directly (`<AppHeader><template #nav><MainNav :open="isOpen" @toggle="toggle" /></template></AppHeader>`) |
| Reusable logic, each caller its own state | composable |
| A subtree needs shared context (form, table, tabs, theme) | `provide`/`inject` |
| Unrelated app areas, needs devtools, SSR, or persistence | Pinia store |
| Server data | query cache — [server data](server-data.md) |

- Passing props down a few levels is fine. Escalate when components in the middle only forward values.
- Local toggles, form inputs and hover state never go into Pinia.
- Events mirror state: emit at the level where the state lives.
- Constants and server-injected config aren't state: put them in a constants module or `app.provide`, not in a store.

## provide / inject [docs, AF, VS, MO, CB]

- Type every key: `export const TabsKey: InjectionKey<TabsContext> = Symbol('tabs')`. Keep keys in a `.ts` module (or a plain `<script lang="ts">` block next to the provider). Import the **same** key object at both ends; string keys collide.
- Distinguish **required** from **optional** context:
  - Required: the child makes no sense alone (`TabPanel` outside `Tabs`). Wrap `inject` in a `useTabs()` helper that throws when the provider is missing.
  - Optional: the child works standalone and only picks up defaults when inside a group (a button inside a button group). `inject(Key, undefined)` and fall back (see "context-supplied defaults" in [components](components.md)).
- Provide `readonly(state)` plus mutation functions; mutations stay in the provider (docs).
- Provide refs or reactive objects to keep injected values live; providing `.value` snapshots goes stale.
- Prefer many small providers placed as deep as possible over one app-wide context. `provide` from `App.vue` is not a global store: no devtools, and hard to trace.
- Use it for compound components (Tabs/TabPanel, Form/Field) and app-level services provided by a plugin.
- When you remove the last `inject` of a key, remove its `provide` too.
- `inject()` outside components (router guards, plugins) works via `app.runWithContext(fn)` (3.3+).
- ⚖ Thiessen argues provide/inject "isn't DI" and increases coupling; the docs present it for injecting services. This skill uses it for subtree context and plugin-provided services, and prefers props for plain data.

## Pinia [docs, VS, AF, GL, CB]

- **Pinia 4** is current: ESM-only, and `@vue/devtools-api` must be installed alongside it. Store code is unchanged from Pinia 3.
- Split stores by domain and by task (an items store and a form-draft store for the same feature). Keep state, getters and actions in one file per store. A store file that grows too big is the signal to split.
- Feature stores live in their feature; stores every feature reads (auth, session, preferences) live in `shared/stores/`.
- **Setup stores** (`defineStore('invoice', () => { … })`) are the default in Composition API codebases: `ref` → state, `computed` → getters, functions → actions. Return **every piece of serializable state**; unreturned state breaks SSR hydration and devtools. Client-only, non-serializable refs (a DOM element) may stay private, and must never be returned. Setup stores need their own `$reset`.
- Option stores are fine if the codebase already uses them. Use regular functions (not arrows) when `this` is needed, and give getters that use `this` explicit return types.
- Destructure state and getters with `storeToRefs(store)`; actions can be destructured directly.
- Team convention (Pinia itself allows `store.x = …`): mutations that carry business rules go through actions. Use `$patch(state => …)` for multi-field or collection updates.
- Getters that don't need store state are plain functions taking arguments, testable without a store.
- Call `useOtherStore()` at the top of a setup store or action, **before any `await`**. Two stores that use each other must not both read each other's state in the setup body; read it inside `computed`s or actions. Stores should never call each other in a cycle: break cycles with a small orchestrator store that calls both.
- Holding a composable in a setup store (`useLocalStorage`): return it and mark non-hydratable refs with `skipHydrate()`. Option stores need a `hydrate(state, initialState)` option instead.
- Never call `useQuery` inside a store: stores live forever, so the query would never stop watching or refetching. Read the cache with `useQueryCache()` if a store needs it.
- Store plugins: `markRaw()` any non-reactive object you attach (router, API client), and declare what the plugin adds by augmenting `PiniaCustomProperties` (store members), `PiniaCustomStateProperties` (state) or `DefineStoreOptionsBase` (new `defineStore` options); see [typescript](typescript.md).
- Add HMR to every store file:

```ts
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useInvoiceStore, import.meta.hot))
```

- Clear all client state on logout or user switch: `$reset()` every store and clear the query cache. Otherwise the next user of the tab sees the previous user's data.

## SSR-safe state [docs, AF, VS]

- No module-level mutable state: it's shared across requests. Create state per app instance (Pinia, `app.provide` in a plugin factory).
- No `window`/`document`/timers in setup on the server. Use `onMounted`, or check `import.meta.env.SSR`.
- Custom SSR with Pinia: serialize `pinia.state.value` with an escaping serializer (`devalue`), because state can contain user input and plain `JSON.stringify` in a `<script>` is an XSS risk. On the client, set `pinia.state.value` before the first `useStore()`.
- Outside an injection context on the server (a guard defined outside setup, `serverPrefetch`), pass the instance: `useStore(pinia)`.
- Stable IDs across server and client: `useId()` (3.5). Never `Math.random()` in render.
- Values that must differ between server and client (relative dates, locale formatting) get `data-allow-mismatch` (3.5) instead of client-only hacks.
