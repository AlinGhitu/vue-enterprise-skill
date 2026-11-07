# Review of six Support Desk apps (Vue 3 + TypeScript)

I read every `.ts` and `.vue` file, every test, and every `round2.diff` in all six apps. I did not read the CSS or SVG assets. Scores cover only the code; type-check, lint and the existing tests are assumed green, as you said.

**One cross-cutting fact first.** In vue-router, `/tickets/new` and `/tickets/:id/edit` reuse the same component instance when both routes point at the same view. A form view that loads its data only once, in `onMounted`, or that never resets when `id` disappears, keeps the old ticket's values when the user goes from Edit to New. Two apps have this bug.

---

## app-K

**Bugs and requirement gaps**
- A ticket closed from the list stays in the list even when the status filter is `open`. Nothing is refetched or invalidated after the close.
- There is no dedicated 404 state. A missing ticket shows the generic `Request failed (404)` text (`TicketDetailView.vue`).
- Every search pause pushes a new history entry (`router.push` in `onSearch`). The debounce timer is not cleared when the URL `q` changes via back/forward.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | No functional bugs found. `TicketFormView` resets via `watch(props.id)` and `:key="ticket?.id ?? 'new'"`, the out-of-range page uses `router.replace`, and a 401 redirects back to the page. Gaps are listed above. |
| 2 | Structure | 3 | Folders by type (`views/components/stores/utils`). `utils/ticketQuery.ts` is a grab-bag: query parsing, `safeRedirect`, status labels and date formatting. |
| 3 | Components | 4 | `TicketForm` has typed props and `defineEmits<{ submit: [...] }>`. `CommentSection` and `TicketBadge` are extracted. But `TicketForm` reads the users store itself, and `TicketListView` (201 lines) inlines the table. |
| 4 | Server data | 3 | Each view fetches by hand with a `seq` counter, so stale responses are dropped but requests are never aborted. `useCloseTicket` mutates the reactive ticket, merges the server reply (`Object.assign`) and rolls back on failure. No cache or invalidation. |
| 5 | State | 4 | Auth is in Pinia with the token mirrored to `localStorage`. The users store is deduped via `pending ??=` and reset on logout and on 401 (`main.ts`). No other server data is copied into stores. |
| 6 | Reactivity | 4 | `query = computed(() => parseListQuery(route.query))` plus `watch(query, load, {immediate})`. Debounce is cleared in `onBeforeUnmount`. |
| 7 | Types | 4 | Clean `TicketPatch = Partial<TicketInput & {status}>`. Some casts: `as T` in the client, `as ListQuery['status']` inside the template. |
| 8 | Errors / UX | 4 | Loading, empty and error-with-Retry everywhere. `aria-busy` dims the stale list. The 401 handler sends the user to `login?redirect=`. Unknown paths redirect to `/tickets`. No not-found state for tickets. |
| 9 | Security | 4 | Token in `localStorage` (readable by XSS). `safeRedirect` blocks `//`, `/\` and `/login`. No `v-html`. |
| 10 | Accessibility | 3 | `aria-invalid` on every field and `role="alert"` on errors. But `aria-describedby="title-error"` is static, so it points at a missing node when there is no error. Login and comment errors are not linked to their inputs. Good: `aria-label="Close ticket ${t.title}"` and an sr-only Actions header. |
| 11 | Tests | 3 | Tests cover pure functions, `useCloseTicket` (optimistic, rollback, dedupe), the auth store and the guard. There are no component tests, so nothing checks the list's URL behaviour. |
| 12 | Change request | 4 | The URL was already the source of truth in round 1, so the diff is small and fits. The "Unknown user" option keeps the select in sync with the URL. Only the parse/serialize tests were updated: no back/forward test, and `assigneeId` is not validated. |
| | **Total** | **44** | |

---

## app-P

**Bugs and requirement gaps**
- **Stale form when going from Edit to New.** In `TicketFormView.vue`, `load()` returns early when `!props.id` without resetting `form`. Clicking "New ticket" in the header from `/tickets/5/edit` shows ticket 5's values, and Create posts a copy of it.
- **A 401 does not redirect.** `setUnauthorizedHandler(clear)` only clears the token. The user stays on the page with a "Not authenticated" error and the header disappears.
- `TicketDetailView` loads the ticket, its comments and the users in one `Promise.all([..., users.load()])`. If `/users` fails, the whole ticket page shows an error.
- A ticket closed from the list stays visible under the `open` filter.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 2 | Two real bugs: the stale Edit→New form and the 401 handler that never redirects. |
| 2 | Structure | 3 | `lib/` mixes a composable (`useCloseTicket.ts`) with utilities. `safeRedirect` lives in `router/index.ts` and `LoginView` imports it from there. |
| 3 | Components | 2 | `StatusBadge` is the only component. The form, comment list and comment form are all inline in views; `TicketDetailView` (138 lines) does ticket, comments and posting. |
| 4 | Server data | 3 | `requestId` guards against stale responses. `closeOptimistically` restores `status` and `updatedAt` on failure. The out-of-range page clamp uses `replace`. No invalidation. |
| 5 | State | 3 | Auth is in Pinia, but `setUnauthorizedHandler(clear)` is a side effect registered inside the store's setup. The users store is never reset on logout. |
| 6 | Reactivity | 4 | Watches `[q, status, assignee, page]` and calls `clearTimeout(debounce)` when the URL changes. Debounce is cleaned up on unmount. |
| 7 | Types | 3 | `updateTicket(id, patch: Partial<Ticket>)` lets callers patch `id` and `createdAt`. Uses `(data ?? {}) as {...}`. |
| 8 | Errors / UX | 3 | Detail has a `notFound` state. Loading, empty and Retry exist. The 401 experience is broken (see above). Login shows a single non-field error. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` does not reject `/\` or `/login`. The guard sends logged-in users away from the login page. |
| 10 | Accessibility | 2 | Inputs are wrapped in labels and have `aria-invalid`, but field errors are neither linked (`aria-describedby`) nor announced. Ten identical "Close ticket" buttons with no context. Empty `<th>`. |
| 11 | Tests | 4 | Client tests (401 hook skipped for login, 422, 204, network error), guard tests on memory history, optimistic tests, query round-trip, and a list component test covering `router.back()` and the search debounce. |
| 12 | Change request | 4 | Extracts `parseListQuery`/`buildListQuery`, distinguishes `push` from `replace`, clears the debounce on URL change, and adds a back-navigation test. The URL key is `assignee` while the API uses `assigneeId`. An unknown id leaves the select blank. |
| | **Total** | **36** | |

---

## app-R

**Bugs and requirement gaps**
- **Stale form when going from Edit to New.** `TicketFormView` loads only in `onMounted(load)` and never watches `props.id`. The header's "New ticket" link from an edit page keeps the old values.
- `status` from the URL is never validated (`status: first(query.status)`). `?status=bogus` is sent to the API and the select shows nothing selected.
- `restore()` calls `clear()` on any error, so a network blip logs the user out.
- Detail page: `Promise.all` with `users.load()` (same failure as P). After a successful close the server's ticket is not merged back, so `updatedAt` stays stale.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 2 | Stale form, unvalidated status, logout on network error. |
| 2 | Structure | 2 | `api/client.ts` holds the transport and every endpoint. `lib/` is a grab-bag. Inline `style="..."` in templates. |
| 3 | Components | 1 | No components at all: four views contain everything, including status badges built by hand twice. |
| 4 | Server data | 2 | `seq` guards. The generic `optimistic(apply, rollback, commit)` helper is neat, but the result is not merged and nothing is invalidated. |
| 5 | State | 3 | Auth and users are in Pinia. Users are not reset on logout. `restore` is too eager to clear the session. |
| 6 | Reactivity | 3 | `onMounted(load)` plus a separate non-immediate watch. `router.push` results are never awaited or `void`ed. Timer cleaned in `onUnmounted`. |
| 7 | Types | 2 | `TicketQuery.status: string`, `ListFilters.status: string`, `statusLabel(s: string)`: the status union is thrown away. |
| 8 | Errors / UX | 3 | Loading, empty and error with Retry. `'Ticket not found.'` for 404. The 401 handler redirects with `redirect`. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` blocks `//` and `/login*` but not `/\`. |
| 10 | Accessibility | 1 | Not a single `aria-invalid` or `aria-describedby` in the app. Field and comment errors are plain `<span class="error">` that screen readers never announce. Filters rely on `aria-label` only. |
| 11 | Tests | 3 | Pure helpers, the auth store with a stubbed `fetch`, the guard via `installGuards`, and the API URL builder (which stubs `localStorage`). No component tests. |
| 12 | Change request | 3 | Extracts `parseListQuery`/`buildListQuery`, but `buildListQuery` copies any unknown query keys through, status is still not validated, and there is no back/forward test. |
| | **Total** | **28** | |

---

## app-T

**Bugs and requirement gaps**
- The token is kept in memory only (`useAuthStore.ts`), so every reload logs the user out. A shared or reloaded URL still lands on the right filters, but only after logging in again via `redirect=`. This is a deliberate, documented trade-off.
- No catch-all route: an unknown URL renders an empty `<RouterView>`.
- No clamp when `page` is beyond the last page. A failed `fetch` (network down) is not wrapped in `ApiError`; pages show a generic message.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | Every feature works. The gaps above are the only findings. |
| 2 | Structure | 5 | `features/{auth,tickets}` plus `shared/{api,lib,ui}`. `configureHttp` is wired in `main.ts` so `shared/` never imports a feature. A second feature would slot in cleanly. |
| 3 | Components | 5 | Separate Create and Edit pages around a pure `TicketForm`: users come in as a prop and it emits typed `submit`/`cancel`. Also `CloseTicketButton`, `CommentSection`, `StateMessage` and a badge. The largest file is 196 lines including styles. |
| 4 | Server data | 5 | Pinia Colada with a key factory (`TICKET_KEYS`) and an `AbortSignal` on every request. `placeholderData` keeps the previous page on screen. `useCloseTicket`: `onMutate` cancels queries and patches the detail entry and every list page. `onError` uses `rollbackTicket`, which only rolls back if the cache still holds the optimistic value. `onSettled` invalidates. Create and edit invalidate `root`. |
| 5 | State | 4 | The auth store holds only token and user. `clearSession` wipes the query cache. No server data is copied into stores. Loses a point for the reload-logout trade-off. |
| 6 | Reactivity | 5 | `params = computed(parseListQuery(route.query))` and `useQuery(() => ({...ticketListQuery(params.value)}))`. Props reach composables through getters. No manual timers. `watch(serverErrors, focusFirstInvalid)`. |
| 7 | Types | 5 | Every payload is parsed from `unknown` (`parseTicket`, `parseTicketPage`, …) with `isStatus`/`isPriority` guards. `event.target instanceof HTMLSelectElement` instead of casts. No non-null assertions in app code. |
| 8 | Errors / UX | 4 | `StateMessage` uses `role="status"` or `role="alert"`. Detail has a 404 state. Retry everywhere. Stale rows stay visible with `aria-busy`. A 401 redirects back. Missing: a not-found route. |
| 9 | Security | 5 | In-memory token. `safeRedirect` rejects `//`, any backslash and `/login`. `skipUnauthorizedHook` on login and logout. Cache cleared on logout and on 401. |
| 10 | Accessibility | 5 | `useId` labels. `aria-invalid` and `aria-describedby` on every field, including the comment box. Focus moves to the first invalid field. `role="search"`, table `<caption>` and `scope="col"`. Close buttons have contextual labels. |
| 11 | Tests | 5 | Form tests check behaviour, including that `aria-describedby` points at the error text. List tests check URL init and back **and** forward. The close mutation is tested against a real Colada cache (optimistic and rollback). Also http, guard, cache helpers and `safeRedirect.each`. |
| 12 | Change request | 5 | Extracted `listParams.ts`. Status is validated on change (`isStatus(value)`). Round-trip test. A component test covers back and forward. The diff only touches the list, the API and the tests. |
| | **Total** | **57** | |

---

## app-W

**Bugs and requirement gaps**
- **Back-button trap.** The page clamp (`watch([pageCount, loading])`) calls `setFilters`, which does `router.push`. Pressing Back from the clamped page returns to `?page=99`, which clamps forward again.
- Cancel on the form is `router.back()`. On a deep-linked or fresh tab it leaves the app.
- `useUsers` keeps users in a module-level `shallowRef`. It is never cleared on logout, and `nameOf` falls back to showing the raw id.
- A ticket closed from the list stays under the `open` filter.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 3 | History trap, Cancel leaving the app, users never cleared. |
| 2 | Structure | 4 | Reusable composables (`useTicketList`, `useCloseTicket`, `useUsers`). The guard's logic is a pure `resolveAuthRedirect` in `router/guard.ts`. Folders are still by type. |
| 3 | Components | 3 | `TicketForm` takes a `submit: (input) => Promise<void>` **prop** instead of emitting, and handles server errors itself. It also calls `useUsers()` internally. |
| 4 | Server data | 3 | `useTicketList` uses a `seq` guard and an immutable `replaceTicket`. The optimistic close works through an `apply` callback, but rollback writes back the whole snapshot. No invalidation. |
| 5 | State | 3 | Auth is in Pinia. Users live in a module singleton outside Pinia, so they cannot be reset or isolated in tests. |
| 6 | Reactivity | 4 | `useTicketList(query: MaybeRefOrGetter)` with `toValue` is the correct composable pattern. `shallowRef` is used throughout. Timers are cleaned up. The clamp watch's side effect is what causes the history trap. |
| 7 | Types | 4 | `TicketErrors` keyed by field union. Casts `as TicketStatus \| ''` after a `hasOwnProperty` check, and `value as TicketStatus` in the template. |
| 8 | Errors / UX | 4 | `NotFoundView`, a 404 state, and a 401 redirect. `restore()` rethrows network errors (`status === 0`) instead of logging the user out, the best handling of this among the four `localStorage` apps. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` accepts `/\…` and `/login`. |
| 10 | Accessibility | 2 | Inputs wrapped in labels with `aria-invalid` on some fields. Errors are not linked or announced. Close buttons have no context. Empty `<th>`. |
| 11 | Tests | 3 | `TicketForm` component tests (behavioural, `data-test` selectors), pure logic tests and guard tests. Nothing for the list, URL syncing or `useTicketList`. |
| 12 | Change request | 3 | Extracts `parseListQuery`/`serializeListQuery` with a round-trip test, but no back/forward test, the clamp uses `push`, and the diff is sloppy (`timer =setTimeout`, `hasErrors,validateComment`). |
| | **Total** | **39** | |

---

## app-Z

**Bugs and requirement gaps**
- In-memory token, so every reload logs the user out (same trade-off as T).
- `CloseTicketButton` is not disabled while the request runs, so a double click sends two PATCH requests.
- On a 404, `TicketDetail` still renders the comments section and the comment form under "Ticket not found".
- A logged-in user can open `/login`. Raw zod error messages can reach the UI via `errorMessage(error)`.

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | Every feature works. Only the minor issues above. |
| 2 | Structure | 5 | `features/{auth,tickets,users}` (users exposed through `index.ts` as its public API), `shared/`, and `app/session.ts` for cross-feature logout. |
| 3 | Components | 4 | Pages and components are separate, and `TicketForm` has typed props and emits. But `TicketForm` calls `useUsers()` itself, and `components/TicketDetail.vue` (163 lines) is really a container running two queries and a mutation. |
| 4 | Server data | 5 | Colada with keys and abort signals. `onMutate` patches every `root` entry and records `{key, previous, optimistic}`. Rollback happens only if `getQueryData(key) === change.optimistic`. Edit seeds the cache with `setQueryData`. Comments are keyed outside `root`, so closing a ticket does not cancel them. Detecting each entry's shape by schema-parsing it is clever but heavy. |
| 5 | State | 4 | Minimal auth store. `useEndSession` and the 401 handler wipe the cache. Same reload trade-off as T. |
| 6 | Reactivity | 5 | Computed filters, getter-based queries, computed `clientErrors`. No timers or listeners to leak. |
| 7 | Types | 5 | Zod schemas are the single source for types and runtime checks. `request<T>(path, schema)` cannot be called without a schema. Weak spots: `ticketId.value ?? ''` and one `as HTMLSelectElement`. |
| 8 | Errors / UX | 4 | `StateMessage`, 404 state, `NotFoundPage`, Retry, server messages shown. The comments form under a 404 is a UX slip. |
| 9 | Security | 5 | In-memory token and a hardened `safeRedirect`. `parseAssignee` and `parseTicketId` restrict ids to `^[A-Za-z0-9_-]{1,64}$`. Login skips the 401 handler. |
| 10 | Accessibility | 4 | Labels, `aria-invalid` and `aria-describedby` on every field. An sr-only ticket title inside each Close button. Table caption and `scope`, `role="search"`. No focus management on invalid submit. |
| 11 | Tests | 5 | Form tests (a server error clears once the field is edited), list tests (back/forward, invalid params), the close mutation against a real cache, http schema rejection, guard. The list test mocks the whole `../api` module, which couples it a little to the implementation. |
| 12 | Change request | 4 | Validates the assignee, updates the query key, and tests back/forward plus `assigneeId=../x`. But serialization stays inline in the page (`update()`) rather than as an extracted, tested pair like the parse functions. |
| | **Total** | **54** | |

---

## Scores and ranking

| Criterion | K | P | R | T | W | Z |
|---|---|---|---|---|---|---|
| 1 Correctness | 4 | 2 | 2 | 4 | 3 | 4 |
| 2 Structure | 3 | 3 | 2 | 5 | 4 | 5 |
| 3 Components | 4 | 2 | 1 | 5 | 3 | 4 |
| 4 Server data | 3 | 3 | 2 | 5 | 3 | 5 |
| 5 State | 4 | 3 | 3 | 4 | 3 | 4 |
| 6 Reactivity | 4 | 4 | 3 | 5 | 4 | 5 |
| 7 Types | 4 | 3 | 2 | 5 | 4 | 5 |
| 8 Errors / UX | 4 | 3 | 3 | 4 | 4 | 4 |
| 9 Security | 4 | 3 | 3 | 5 | 3 | 5 |
| 10 Accessibility | 3 | 2 | 1 | 5 | 2 | 4 |
| 11 Tests | 3 | 4 | 3 | 5 | 3 | 5 |
| 12 Change request | 4 | 4 | 3 | 5 | 3 | 4 |
| **Total / 60** | **44** | **36** | **28** | **57** | **39** | **54** |

1. **app-T: 57**
2. **app-Z: 54.** Nearly level with T. Loses points on the container component, the close button with no pending guard, and serialization left inline.
3. **app-K: 44.** The best of the hand-rolled-fetch apps: no functional bugs, but no cache and thin accessibility.
4. **app-W: 39**
5. **app-P: 36.** Its tests are good, but the app has two real bugs.
6. **app-R: 28**

---

## The three most important differences between the best (T) and the worst (R)

### 1. Server state: a cache with optimistic updates versus mutating one object in place
T closes the ticket in every cached copy (the detail entry and every list page), only rolls back if nothing newer has replaced the optimistic value, and then invalidates so filtered lists correct themselves:
```ts
// app-T/src/features/tickets/useCloseTicket.ts
onMutate(ticket) {
  queryCache.cancelQueries({ key: TICKET_KEYS.root })
  ...
  queryCache.setQueriesData<TicketPage | undefined>({ key: TICKET_KEYS.lists }, (page) =>
    mapTicketInPage(page, ticket.id, withTicketClosed))
},
onError(_e, ticket) { /* rollbackTicket(current, ticket): only if still 'closed' */ },
onSettled: () => queryCache.invalidateQueries({ key: TICKET_KEYS.root }),
```
R flips one reactive object, never merges the server's reply, and never refetches. A ticket closed under the "Open" filter stays on screen:
```ts
// app-R/src/lib/optimistic.ts
() => { ticket.status = 'closed' },
() => { ticket.status = previous },
() => update(ticket.id, { status: 'closed' }),
```

### 2. Form lifecycle: separate keyed pages versus a reused view that loads once
T has separate Create and Edit pages. Edit data comes from a reactive query keyed on `props.id`, so a stale form is impossible:
```ts
// app-T/src/features/tickets/TicketEditPage.vue
const { state, refetch } = useQuery(() => ticketQuery(props.id))
```
R serves both routes with one component and loads only on mount. Going from `/tickets/5/edit` to the header's "New ticket" reuses the instance, so the form keeps ticket 5's data and Save creates a duplicate:
```ts
// app-R/src/views/TicketFormView.vue
const isEdit = computed(() => !!props.id)
...
onMounted(load)            // no watch(() => props.id)
```

### 3. Accessible validation: linked, focusable errors versus silent text
In T, every field's error is tied to its input and focus jumps to the first invalid field:
```vue
<!-- app-T/src/features/tickets/TicketForm.vue -->
<input :id="`${uid}-title`" v-model="draft.title"
  :aria-invalid="errorFor('title') ? 'true' : undefined"
  :aria-describedby="errorFor('title') ? `${uid}-title-err` : undefined" />
<span v-if="errorFor('title')" :id="`${uid}-title-err`" class="error">…</span>
```
In R, errors are plain spans with no link to the input and no live region. Screen-reader users get no feedback on failed validation or on 422 errors from the API:
```vue
<!-- app-R/src/views/TicketFormView.vue -->
<input id="title" v-model="form.title" />
<span v-if="errors.title" class="error">{{ errors.title }}</span>
```