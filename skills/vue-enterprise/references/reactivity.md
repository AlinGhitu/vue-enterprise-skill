# Reactivity

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

## Choosing the primitive [docs, MT, AF]

- `ref` is the default (docs: "the primary API for declaring reactive state"). It holds any type, can be reassigned, survives destructuring, and can be passed to functions and `watch`.
- `shallowRef` for large, external or replace-only data: API responses you replace wholesale, big immutable lists, and instances of third-party classes (editors, maps, charts). Update it by assigning `.value`; after an in-place mutation, call `triggerRef`.
  - ⚖ Anthony Fu and VueUse default to `shallowRef` everywhere; the docs default to `ref`. This skill follows the docs for component state and uses `shallowRef` where the data is large or external.
- `reactive` only for a grouped unit of state or a `Map`/`Set`. It can't be reassigned (`state = reactive({…})` disconnects), and destructuring or passing a property into a function loses reactivity (use `toRefs` / `toRef`).
- `markRaw` for objects that must never be proxied (vendor instances inside reactive state). A proxied library object breaks silently.
- Refs are **not** auto-unwrapped as array elements, inside `Map`/`Set`, or inside `shallowReactive`. In a template, a ref nested in a **plain** object isn't unwrapped either: `{{ obj.count + 1 }}` renders `[object Object]1`. Destructure it to a top-level binding first. Refs inside `reactive` objects *are* unwrapped.
- Always work on the proxy, never the original object; mutating the original triggers nothing. `toRaw` is an escape hatch; don't keep references to its result.
- Never hand reactive proxies **out** to code outside Vue: query-cache writes, `postMessage`/workers, IndexedDB, `structuredClone`, third-party stores. Pass `toRaw(x)`, a clone of it, or a freshly built plain object. Proxies either fail to clone or break the other library's assumptions.

## computed [docs, MT]

- Anything derivable from other state is a `computed`: cached, lazy, pure. Don't store derived state in a `ref` and sync it with a watcher.
- Getters are side-effect free: no mutation, no requests, no DOM or storage access.
- Never mutate a computed's return value. `sort()` and `reverse()` mutate in place, so copy first: `[...list.value].sort(…)`.
- A computed only re-runs when its reactive dependencies change. `Date.now()`, `localStorage` and module variables aren't reactive — drive them from a ref updated by an interval or event (or a VueUse composable like `useNow`).
- Computeds can't take arguments. For per-item logic, extract a child component or return a function (which isn't cached).
- Vue ≥ 3.4: a computed only triggers dependents when its value actually changes. An object-returning computed can take `oldValue` as its argument and return it when nothing meaningful changed.

## Watchers — side effects only [docs, MT]

- Use `watch`/`watchEffect` for effects: fetching, DOM or browser APIs, storage, logging, syncing to something outside Vue. If a `computed` can express it, it's not a watcher.
- Prefer `watch` with explicit sources. `watchEffect` re-runs when *anything* it reads changes, and that set grows silently as the callback is edited. Keep it for effects that really depend on everything they read.
- Sources: a ref, a getter, a reactive object, or an array of those. `watch(obj.count, …)` passes a number and watches nothing; use `watch(() => obj.count, …)`.
- Watching a `reactive` object directly is implicitly deep, and on mutation `newValue === oldValue` (same object). A getter returning an object needs `{ deep: true }` to see nested changes. Deep watching traverses everything and is expensive on large structures. Watch the specific path instead, or use `deep: <number>` (3.5) to limit depth.
- Options: `immediate`, `once` (3.4), and `flush: 'post'` when the callback reads updated DOM. `flush: 'sync'` sparingly.
- `watchEffect` tracks only what it reads **before the first `await`**.
- **Cleanup:** cancel stale work before the next run. Vue ≥ 3.5: `onWatcherCleanup(() => controller.abort())`, called synchronously before any `await`. Earlier versions: the `onCleanup` argument (third argument of the `watch` callback, first of `watchEffect`). Use it for timers, listeners and in-flight requests.
- Create watchers synchronously in setup; they then stop on unmount. A watcher created in a `setTimeout` or after an `await` leaks unless you stop it manually (`const stop = watch(…); stop()`).
- Vue ≥ 3.5 watch handles also have `.pause()` and `.resume()`.
- A watcher that copies state between parent and child invites update loops. Use `defineModel` or lift the state instead.

## DOM timing [docs, MT]

- DOM updates are batched to the next tick. After changing state, `await nextTick()` before measuring or focusing. A `flush: 'post'` watcher is the same thing expressed as a reaction; choose by readability.
- Template refs: Vue ≥ 3.5 `const input = useTemplateRef('input')` (the element type is inferred from the template with current Vue language tools; add a generic only for dynamic keys); earlier versions use `ref<HTMLInputElement | null>(null)` with the same name. They are `null` until mounted and after a `v-if` removes the element, so access them in `onMounted` and null-check (`input.value?.focus()`).
- A `ref` inside `v-for` gives an array whose order does **not** match the source array.
- If you reach for `nextTick` often, the design is fighting the render cycle.
- `useId()` (3.5) is called once at setup's top level, never inside a `computed`.

## Lifecycle and async setup [docs, AF, MT]

- Lifecycle hooks, `watch`, `computed`, `provide` and `inject` must be registered synchronously during setup. Outside `<script setup>`, anything after the first `await` has lost the component instance: hooks warn or silently do nothing, and effects are never disposed.
- `<script setup>` top-level `await` restores the instance after each `await`, but it turns the component async, which requires a `<Suspense>` ancestor (still **experimental**).
- The preferred pattern is **async → sync**: declare the refs, start the promise without awaiting, fill the refs when it resolves, and return them synchronously. Callers build `computed`s on data that hasn't arrived yet, and no `await` is needed in setup. See [composables](composables.md).
- SSR: only setup runs on the server. `onMounted`/`onUnmounted` don't run there. Put `window`/`document` access in `onMounted`.

## Effect scopes [docs, MT, AF]

- A component's setup is already a scope; its effects stop on unmount.
- Use `effectScope()` to group effects created outside components (or with a shorter lifetime than the component) and dispose them together with `scope.stop()`.
- `effectScope(true)` creates a detached scope that outlives its creator. Use it for shared singletons (as in VueUse `createSharedComposable`).
- In composables, clean up with `onScopeDispose` rather than `onUnmounted`: it works in components **and** in bare scopes. Vue 3.5: `onScopeDispose(fn, true)` suppresses the warning when there's no active scope.

## "It isn't updating" checklist [MT, docs]

1. Is the state declared reactive (`ref`/`reactive`), not a plain variable added later?
2. Was a prop or store value copied into a local `ref` (a one-time snapshot)? Read it directly or use `computed`/`storeToRefs`.
3. Was a `reactive` object destructured or reassigned?
4. Is a watcher watching a value instead of a getter?
5. Is a mutated object inside a `shallowRef` (needs reassignment or `triggerRef`)?
6. Is the list keyed by index while items hold state?
7. Only then force a reset with `:key`.
