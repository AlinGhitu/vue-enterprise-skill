# VueUse mapping

Source tags: [docs] vueuse.org function pages (via the `vueuse-functions` skill) · [AF] VueUse guidelines · [CB] open-source codebases.

How this file relates to the `vueuse-functions` skill: that skill owns **which** composable fits and **how** to call it (its per-function pages carry usage and type declarations; load it when it is available). This file owns the enterprise side: what to replace, what not to replace, and the checks before adding the dependency. When `vueuse-functions` isn't installed, the tables here plus vueuse.org are enough to proceed.

## Before using VueUse in a project

- Check `package.json` for `@vueuse/core`. If absent, propose adding it (with the version pinned like the rest of the project) rather than installing silently; in a pnpm workspace, add it to the catalog. Add-ons are separate packages with their own peers: `@vueuse/router` (Vue Router), `@vueuse/integrations` (each function needs its underlying library, e.g. `focus-trap`, `fuse.js`, `sortablejs`), `@vueuse/motion`, `@vueuse/head`, `@vueuse/rxjs`, `@vueuse/electron`, `@vueuse/firebase`. Nuxt: `@vueuse/nuxt` auto-imports `@vueuse/core` (but not `useFetch`/`useStorage`, which clash with Nuxt's own).
- A project that forbids new dependencies, or has a bundle budget the extra kilobytes break, copies the one composable it needs into `shared/composables/` with a comment linking the upstream source and version.
- Import from `@vueuse/core`, not `@vueuse/shared` (an internal package). Types such as `MaybeRefOrGetter` come from `vue` (VueUse deprecated its copies).

## Hand-written logic → VueUse

When reviewing or refactoring, flag the left column and name the replacement on the right.

| Hand-written pattern | Replace with |
|---|---|
| `addEventListener` in `onMounted` + `removeEventListener` in `onUnmounted` | `useEventListener` (auto cleanup, accepts refs and getters as targets) |
| `document` click handler that checks `contains()` to close a menu | `onClickOutside` |
| `keydown` handler comparing `e.key` (Escape, arrows, shortcuts) | `onKeyStroke`, `useMagicKeys`, `useKeyModifier` |
| `setTimeout`-based debounce or throttle, or a lodash import for it | `useDebounceFn`, `useThrottleFn`, `refDebounced`, `refThrottled`, `watchDebounced`, `watchThrottled` |
| `setInterval`/`setTimeout` with manual `clearInterval` | `useIntervalFn`, `useTimeoutFn`, `useTimeoutPoll`, `useCountdown`, `useRafFn` |
| `localStorage.getItem` + `JSON.parse` + a watcher that writes back | `useStorage`, `useLocalStorage`, `useSessionStorage` (`useStorageAsync` for async backends) |
| `new ResizeObserver` / `getBoundingClientRect` in a handler | `useResizeObserver`, `useElementSize`, `useElementBounding` |
| `new IntersectionObserver` for lazy sections or "is visible" | `useIntersectionObserver`, `useElementVisibility`, `useInfiniteScroll` |
| `new MutationObserver` | `useMutationObserver` |
| `window.matchMedia` / hard-coded breakpoints | `useMediaQuery`, `useBreakpoints`, `usePreferredDark`, `usePreferredReducedMotion` |
| `window.innerWidth`/`scrollY` read in handlers | `useWindowSize`, `useWindowScroll`, `useScroll`, `useScrollLock` |
| `document.activeElement` polling, focus bookkeeping | `useActiveElement`, `useFocus`, `useFocusWithin` |
| `navigator.clipboard.writeText` with a "copied" timeout | `useClipboard` |
| `navigator.onLine` listeners, `visibilitychange` handlers | `useOnline`, `useNetwork`, `useDocumentVisibility`, `useWindowFocus` |
| `document.title = …` | `useTitle` (Nuxt: `useHead`) |
| Dark-mode class toggling plus persistence | `useDark`, `useColorMode` |
| A `Date.now()` that should tick, "3 minutes ago" strings | `useNow`, `useTimestamp`, `useTimeAgo`, `useTimeAgoIntl` |
| Keeping the previous value of a ref, undo/redo stacks | `usePrevious`, `useRefHistory`, `useManualRefHistory` |
| Boolean flip helpers, counters, cycling through options | `useToggle`, `useCounter`, `useCycleList` |
| Pending/error state around a one-off client-side async call (not server data) | `useAsyncState` |
| `WebSocket`/`EventSource` with reconnect and heartbeat code | `useWebSocket`, `useEventSource` |
| Virtualized or infinite lists written by hand | `useVirtualList` (or `vue-virtual-scroller`), `useInfiniteScroll` |
| Drag, drop zones, swipe detection | `useDraggable`, `useDropZone`, `useSwipe`, `usePointerSwipe`, always with a click or keyboard alternative (WCAG 2.5.7, [accessibility](accessibility.md)) |
| Reading/writing the query string through `router.replace` for filters | `useRouteQuery`, `useRouteParams` (`@vueuse/router`) |
| `aria-live` region wiring for announcements | `useLiveAnnouncer` |
| Textarea auto-grow on input | `useTextareaAutosize` |
| Idle detection, wake lock, page-leave | `useIdle`, `useWakeLock`, `usePageLeave` |
| Module-level "shared instance" of a composable (one listener app-wide) | `createSharedComposable` (falls back to per-call instances under SSR) |
| Hand-rolled `provide`/`inject` pair with a key and a throwing `useX()` | `createInjectionState` (or the project's `createContext` helper) |
| Promise-returning confirm dialog | `useConfirmDialog`, `createTemplatePromise` |
| Reactive `Array.filter`/`find`/`sort` re-implemented as composables | plain `computed`; the `useArray*`/`useSorted` helpers only when a ref-based signature is needed |

## Keep the enterprise rule instead

VueUse covers these, but the skill's architecture rules win:

| VueUse function | Use instead | Why |
|---|---|---|
| `useFetch`, `useAxios`, `useAsyncState` for server data | Pinia Colada queries and mutations ([server data](server-data.md)) | Server data is a cache with staleness, dedupe and invalidation; `useFetch` has none of that |
| `createGlobalState` for app-wide state | Pinia store ([state and data](state-and-data.md)) | Module-level state leaks across SSR requests and tests, and has no devtools |
| `useEventBus` | Props, events, provide/inject, a store, or a query invalidation | Event buses hide data flow; the same rule removes `$on`/`$off` in [migration](migration.md) |
| `useVModel`, `useVModels` | `defineModel` (Vue ≥ 3.4) | VueUse's own page recommends `defineModel`; keep `useVModel` for TSX or `deep: true` only |
| `useUrlSearchParams` in a Vue Router app | `useRouteQuery` from `@vueuse/router` | Two owners of the URL fight each other |
| `useStorage` for tokens, sessions or PII | The BFF session cookie ([security](security.md)) | Storage is readable by any script on the origin |
| `useCookies`, `useJwt` for auth state | The auth adapter ([security](security.md)) | Decoding a token client-side isn't validating it |
| `useTemplateRefsList` | `useTemplateRef` (Vue ≥ 3.5) for single refs; keep it only for `v-for` refs | The built-in infers the element type |
| `toRef`, `get`, `set` from VueUse | Vue's `toRef`, `toValue`, `.value` | Marked EXPLICIT_ONLY in `vueuse-functions` too |
| `useTitle` in Nuxt | `useHead` / `useSeoMeta` | Nuxt owns the head |
| `useMediaQuery`, `useBreakpoints` under SSR without `ssrWidth` | The same functions with `ssrWidth` or `provideSSRWidth` | Otherwise hydration mismatches |
| `useFocusTrap` (integrations) for dialogs | A headless dialog primitive (Reka UI, Headless UI) ([accessibility](accessibility.md)) | Focus trapping is only one part of an accessible dialog |

## Custom composable anyway

Write your own when a VueUse function doesn't exist for the behaviour, when its SSR behaviour doesn't fit (check the function page for `ssrWidth`, `initOnMounted`, `window`/`document` options), when the bundle or dependency policy forbids it, or when the app needs domain semantics on top (wrap the VueUse function inside the domain composable). Say which reason applies in the composable's doc comment, and follow the contract in [composables](composables.md).
