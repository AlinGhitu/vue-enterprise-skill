# Composables

Source tags: [docs] official docs · [MT] Michael Thiessen · [AF] Anthony Fu / VueUse · [VS] Vue School · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

## Check VueUse first [AF]

Before writing a composable for events, observers, storage, media queries, clipboard, debounce/throttle, timers, element size or visibility, check whether VueUse has it (`useEventListener`, `useStorage`, `useIntersectionObserver`, `useDebounceFn`, `watchDebounced`, `useElementSize` …). It already handles cleanup and SSR. Load the `vueuse-functions` skill when it is available; the replacement table, the cases where this skill's rules win (server data, app-wide state, event buses, v-model), and the dependency check are in [vueuse-mapping](vueuse-mapping.md). If the project doesn't depend on VueUse, propose adding it, or copy the one composable you need with a comment linking its upstream source.

## Design the call site first [MT]

Write the component code that *uses* the composable before implementing it. Settle three things from real call sites: the arguments (ref or raw, single or many), the options, and the return shape. Build only what current callers need.

## The contract [docs, AF, MT]

The shape below applies to every composable. The example fetches data only because that's the familiar case. **For server data, use Pinia Colada** ([server data](server-data.md)); write a fetch composable like this one only in a project without a query library.

```ts
import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { toError } from '@/shared/lib/errors'
import { fetchInvoice, type Invoice } from '../api'

export interface UseInvoiceOptions { immediate?: boolean }
export interface UseInvoiceReturn {
  data: Readonly<ShallowRef<Invoice | null>>   // Readonly: callers read, only the composable writes
  error: Readonly<ShallowRef<Error | null>>
  isLoading: Readonly<ShallowRef<boolean>>
  reload: () => Promise<void>
}

export function useInvoice(
  id: MaybeRefOrGetter<string>,                 // required inputs first
  options: UseInvoiceOptions = {},              // options object last
): UseInvoiceReturn {                           // explicit return type on exported functions
  const { immediate = true } = options          // every option has a default
  const data = shallowRef<Invoice | null>(null)
  const error = shallowRef<Error | null>(null)
  const isLoading = shallowRef(false)
  let controller: AbortController | undefined

  async function load(currentId: string) {
    controller?.abort()                         // a newer load cancels the older one
    const current = (controller = new AbortController())
    isLoading.value = true
    error.value = null
    try { data.value = await fetchInvoice(currentId, { signal: current.signal }) }
    catch (e) { if (!current.signal.aborted) error.value = toError(e) }   // e is unknown: convert, never cast
    finally { if (!current.signal.aborted) isLoading.value = false }
  }

  watch(() => toValue(id), load, { immediate }) // toValue inside the getter → tracked
  onScopeDispose(() => controller?.abort())     // self-cleanup on unmount / scope stop
  return { data, error, isLoading, reload: () => load(toValue(id)) }  // plain object of refs + functions
}
```

- **Name:** `useX` for anything that uses reactivity or lifecycle. A pure function doesn't get the `use` prefix; keep it a plain utility.
- **Flexible arguments:** accept `MaybeRefOrGetter<T>` (3.3+) so callers can pass a value, a ref, or a getter (`() => props.id`). Read it with `toValue()` inside a getter or `watchEffect` so it's tracked. `toRef(x)` normalizes to a ref; `ref(existingRef)` returns the same ref.
- **Options object:** use one once there are more than two optional parameters. Every option gets a default via destructuring. Forward options to nested composables with spread. A composable with many required parameters, or sprawling options, does too much; split it.
- **Returns:** a plain, non-reactive object of refs and functions, so callers can destructure it or wrap it with `reactive()`. Never return a `reactive` object (destructuring breaks it).
- **Dynamic return:** when the common case is one value, return the bare ref, and return `{ value, pause, resume }` only with `{ controls: true }`.
- **Readonly state:** when changes must go through the composable's functions, return `readonly(state)` plus mutators.
- **Watch options passthrough:** a composable that watches internally should accept `immediate`/`flush` and pass them on.

## Thin composables [MT]

Put business rules in pure functions (`calculateInvoiceTotal(lines)`); the composable only wires reactivity around them. Unit-test the pure functions without Vue; the composable stays too thin to break.

For state that changes through several named actions, or whose next value depends on the previous one, go one step further: a pure `reducer(state, action)` plus a composable that returns `readonly(state)` and `dispatch`. All transitions then live in one Vue-free, trivially testable function. [MO]

## Side effects and cleanup [docs, AF]

- Whatever the composable starts (listeners, timers, observers, sockets, requests), it stops. Use `onScopeDispose` (works in components and in `effectScope`) or VueUse `tryOnScopeDispose`, and `onWatcherCleanup` for per-run cleanup.
- DOM and browser access goes in `onMounted` or behind a guard. For SSR and tests, accept injectable globals (`{ window = defaultWindow }` where `defaultWindow` is `undefined` on the server).
- For Web APIs with patchy support, expose `isSupported` and guard on it.
- Composables are called synchronously in setup, or inside another composable, or in lifecycle hooks. Never call them in event handlers, `setTimeout`, or after `await` outside `<script setup>`. No lint rule catches this inside composables, so review for it (see [tooling](tooling.md)).
- Register lifecycle hooks unconditionally at the top of the composable, never inside an `if`.
- Prefer taking callbacks as arguments over registering hooks the caller can't see. When a hook is necessary, the same composable cleans up after it.
- Never use `getCurrentInstance()` to reach the component (for `emit`, props or the instance). Take what you need as arguments; `getCurrentInstance` is an internal escape hatch and returns `null` under Vapor.

## Async composables [AF, MT, docs]

- **Async → sync:** create the refs, start the work without `await`, return the refs immediately, fill them later. Include `isLoading`/`error`.
- Optionally make the return also awaitable (VueUse returns `state & PromiseLike<state>`) so it works under `<Suspense>` and in scripts.
- Cancel superseded requests (an `AbortController` per request, as in the contract above) so an older response can't overwrite a newer one.
- For server data, a query library (Pinia Colada) replaces most hand-written async composables; see [server data](server-data.md).

## Shared state composables [MT, AF, docs]

- **Data store pattern:** module-level state + a composable returning `readonly` state and mutators. ⚖ Thiessen recommends it for client-only apps. This skill doesn't: module state leaks between SSR requests (docs), bleeds between tests, and gets duplicated when two bundles load the module (GitLab). Use Pinia, or create the state per app in a plugin (`app.provide` with a typed key).
- For state scoped to a component subtree, VueUse `createInjectionState` gives a typed provide/use pair.
- `createSharedComposable` (VueUse) shares one instance across all callers and disposes it when the last caller unmounts. Useful for expensive listeners (`useMouse` app-wide).

## Splitting [MT]

- Split mutually exclusive code paths into separate composables instead of one composable with a mode flag.
- Composables compose: build `useFilteredList` from `useFilter` and `useSort`.
