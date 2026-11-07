# Support Desk: review of six Vue 3 apps

I read every `.ts`/`.vue` file under `src/` in all six apps, plus each `round2.diff` and the three spec files. I skimmed the CSS and `logo.svg`. Type-check, lint and the apps' own unit tests are not scored.

All six apps already kept `q`, `status` and `page` in the URL after round 1. So the change request mostly tests how cleanly each app added `assigneeId`, validated it, and covered it with tests.

---

## app-B (Pinia, hand-written fetching)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | Few real bugs, three gaps: (a) after Close in a `status=open` list the closed row stays, because `useCloseTicket` mutates the row and nothing refetches; (b) a 404 shows the raw message "Request failed (404)" and unknown routes redirect to `/tickets`; (c) `TicketForm.vue` always sets `aria-describedby="title-error"`, even when that element isn't rendered. |
| 2 | Structure | 3 | Folders by file type (`api/ components/ composables/ stores/ utils/ views/`). `utils/ticketQuery.ts` is a grab bag: query parsing, `safeRedirect`, status labels and date formatting. A second feature would mix into the same folders. |
| 3 | Components | 4 | `TicketForm` has typed props and `defineEmits<{ submit: [...] }>`, but loads the users store itself. `CommentSection` and `TicketBadge` are extracted. Largest file: `TicketListView.vue` at 201 lines. |
| 4 | Server data | 3 | Every load has a `seq` guard against stale responses (list, detail, form, comments). No cache and no request abort. The optimistic close is `ticket.status='closed'` then `Object.assign(ticket, server)`, rolled back in the catch. Nothing is invalidated. |
| 5 | State | 4 | Pinia `auth` and `users` stores; `users.reset()` runs on logout and on 401. Ticket data stays local to each view. |
| 6 | Reactivity | 4 | `computed(() => parseListQuery(route.query))` feeds `watch(query, load, {immediate})`. The debounce timer is cleared `onBeforeUnmount`. A `watch` keeps the search box in sync on back/forward. |
| 7 | Types | 4 | `api/types.ts` is complete, with `TicketPatch = Partial<TicketInput & {status}>`. Casts: `(await res.json()) as T` and `($event.target as HTMLSelectElement).value as ListQuery['status']`. |
| 8 | Errors / UX | 4 | Loading, empty, error and Retry on every view. The list clamps an out-of-range page with `router.replace`. The 401 handler in `main.ts` clears the session and redirects with `redirect=fullPath`. No 404 page. |
| 9 | Security | 4 | Token in `localStorage` (readable by any XSS). `safeRedirect` rejects `//`, `/\` and `/login`. No `v-html`. |
| 10 | Accessibility | 4 | Labels use `for`/`id`; errors have `role="alert"` and `aria-invalid`; per-row `aria-label="Close ticket …"`; `aria-busy`; `nav aria-label`. Login and comment errors are not tied to their inputs. |
| 11 | Tests | 3 | Validation, query parsing, `safeRedirect`, `useCloseTicket` (behaviour, including duplicate clicks), the auth store, and the guard on the real router. No component test for the list or URL behaviour. |
| 12 | Change request | 4 | Small, well-fitted diff. Nice touch: an "Unknown user" option keeps an unknown `assigneeId` from the URL selectable. `assigneeId` itself is not validated. Only the unit tests were updated, with no back/forward test. |

**Total: 45/60**

---

## app-D (Pinia, hand-written fetching)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 3 | (a) **Stale form bug:** `/tickets/:id/edit` and `/tickets/new` share `TicketFormView`, so Vue reuses the instance. When `id` becomes undefined, `load()` returns early without resetting `form`. The header's "New ticket" link then opens a form pre-filled with the edited ticket, and submitting it creates a copy. (b) The 401 handler is `setUnauthorizedHandler(clear)`, which clears the token but never redirects. (c) The detail page runs `Promise.all([getTicket, listComments, users.load()])`, so a failing `/users` breaks the whole page. (d) A closed ticket stays in a filtered list. |
| 2 | Structure | 3 | `views/ lib/ stores/ api/` with a single component. `lib/` mixes the composable, validation and formatting. |
| 3 | Components | 2 | Only `StatusBadge` is extracted. The form sits inline in `TicketFormView` (124 lines) and comments inline in `TicketDetailView` (138 lines). |
| 4 | Server data | 3 | `requestId` guards against stale responses. Optimistic close goes through `closeOptimistically(ticket, send)`, which restores `status`/`updatedAt` on failure. No cache, abort or invalidation. |
| 5 | State | 4 | Pinia auth and users. The store registers the 401 handler as a side effect inside its own setup. `users` is never reset on logout. |
| 6 | Reactivity | 4 | Watches primitive computeds `[q,status,assignee,page]`. The debounce is cleared when the URL changes and on unmount. |
| 7 | Types | 3 | `updateTicket(id, patch: Partial<Ticket>)` lets callers send `id` or `createdAt`. `(data ?? {}) as {…}` and `data as T`. |
| 8 | Errors / UX | 3 | Detail page has a `notFound` state; Retry buttons exist. The 401 case leaves the user on an error screen, and only the next navigation hits the guard. Unknown routes redirect. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` doesn't block `/\` or `/login`. Defence in depth only: `router.replace` stays in-app. |
| 10 | Accessibility | 3 | Labels wrap their inputs; `aria-invalid` only on title, description and comment. Form errors are plain `<span>`s with no `role` or `aria-describedby`. Ten identical "Close ticket" buttons. |
| 11 | Tests | 4 | Client (401 and 204), guard on the real router (including the return trip after login), logic tests, and `TicketListView.spec` which mounts the view and tests URL write, page reset and `router.back()`. |
| 12 | Change request | 5 | Pulled `parseListQuery`/`buildListQuery` out into `lib/` with a round-trip test, switched the page clamp from push to `replace`, and cleared the pending debounce on URL change. Added a component test that covers back navigation. |

**Total: 40/60**

---

## app-F (Pinia Colada, runtime parsers)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | (a) The token is kept in memory only (`useAuthStore.ts`), so every reload logs the user out. Filters do survive a reload, but only after logging in again. (b) No catch-all route, so an unknown URL renders a blank page. (c) `page=99` shows "No tickets match" instead of clamping. (d) `parseInt` accepts `page=3abc`. |
| 2 | Structure | 4 | `features/auth`, `features/tickets`, `shared/{api,lib,ui}`. `configureHttp` wiring keeps `shared/` from importing features. But `features/tickets/` is flat (pages, components, api and cache mixed), and `useUsers` lives inside tickets. |
| 3 | Components | 5 | `TicketForm` is presentational: users come in as a prop, with typed `submit`/`cancel` emits. Pages are thin, and `CloseTicketButton`, `StateMessage` and `TicketStatusBadge` are extracted. Largest: the list page at 196 lines including CSS. |
| 4 | Server data | 5 | Query keys from a factory; `signal` reaches `fetch`; `placeholderData` keeps the previous page. `useCloseTicket` cancels queries, writes "closed" into the detail entry and every list page, rolls back only if the cache still holds the optimistic value (`rollbackTicket`), and invalidates on settle. Stale responses can't win because results are keyed by params. |
| 5 | State | 5 | Pinia holds only token and user; server data lives in the Colada cache, with no copies. `clearSession` cancels and removes every cache entry. |
| 6 | Reactivity | 5 | `useQuery(() => ticketListQuery(params.value))` reacts to the route on its own. There is one sync `watch`, for the search box. `watch(() => props.serverErrors, focusFirstInvalid)`. |
| 7 | Types | 5 | `parseTicket`/`parseTicketPage`/`parseUsers` check data at runtime; `isStatus`/`isPriority` are type guards. App code has no `as` casts on API data. `TicketFormValues` (raw strings) is kept separate from `TicketInput`, the typed payload. |
| 8 | Errors / UX | 4 | `StateMessage` with `role=status`/`alert`; detail page says "Ticket not found."; each row shows its own close error. 401 clears the session and redirects back. Missing: a 404 route and page clamping. |
| 9 | Security | 5 | In-memory token, a deliberate trade-off against XSS. `safeRedirect` rejects `\`, `//` and `/login`. Logout wipes the cache. |
| 10 | Accessibility | 5 | `useId` labels; `aria-describedby` only while an error exists; focus moves to the first invalid field; `role="search"`; table `caption` and `scope="col"`; per-row close `aria-label`. |
| 11 | Tests | 5 | http, guard, `safeRedirect`, validation, `TicketForm` (asserts `aria-describedby` points at the error), list page with back and forward (stubs only `fetch`), and close/rollback through a real query cache. |
| 12 | Change request | 5 | Extracted `listParams.ts` with a round-trip test; the status change is now guarded by `isStatus`. The component test covers URL to controls, controls to URL, and back/forward. |

**Total: 57/60**

---

## app-H (Pinia Colada and zod)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 4 | (a) Same as F: in-memory token, so a reload forces login. (b) An out-of-range page isn't clamped. (c) A logged-in user who visits `/login` isn't redirected away. (d) The edit form can't change status (allowed, but B, F and Q offer it). |
| 2 | Structure | 5 | `app/session.ts`, `features/{auth,tickets,users}`, `pages/` vs `components/`, `shared/`. `features/users/index.ts` is a public entry point for the users feature. Easiest of the six to extend with a second feature. |
| 3 | Components | 4 | `TicketDetail.vue` (163 lines) is filed as a component but does fetching plus the comment mutation. `TicketForm` calls `useUsers()` itself, which forces the test to mock it. `CloseTicketButton` takes primitive props. |
| 4 | Server data | 5 | Colada keys, abort signals, `placeholderData`. The optimistic close snapshots each changed cache entry and restores it only `if (getQueryData(key) === change.optimistic)`, then invalidates. One smell: cache entries are recognised by zod-parsing their data (`optimisticValueFor`) rather than by key. |
| 5 | State | 5 | Same model as F. Session teardown (cancel and remove every entry) is written twice, in `main.ts` and in `app/session.ts`. |
| 6 | Reactivity | 5 | Getter-based `useQuery`; the edit page passes `enabled: ticketId.value !== null`. `TicketForm` uses an `edited` map so a server error disappears once its field is edited. |
| 7 | Types | 4 | zod schemas are the single source of types. But `validate(schema: z.ZodType, …)` returns `Record<string,string>`, which loses field-key typing, and there are `(e.target as HTMLSelectElement)` casts in `TicketForm`. |
| 8 | Errors / UX | 5 | `NotFoundPage` catch-all; "Invalid ticket id." via `parseTicketId`; 404 versus generic errors; retry everywhere; 401 clears the cache and redirects back. |
| 9 | Security | 5 | In-memory token; strict `safeRedirect`. Ticket ids and assignee ids from the URL must match a regex. |
| 10 | Accessibility | 4 | Explicit ids, conditional `aria-describedby`/`aria-invalid`, `caption`, `scope`, close button text with an sr-only title, `nav aria-label`. No focus management after a failed submit. |
| 11 | Tests | 5 | http including schema mismatch; pure guard; schemas and query parsers; pure optimistic helpers; `useCloseTicket` through a real cache; `TicketForm`; list page with invalid params, back/forward and search-box sync. Mocking `request` to return users is slightly tied to internals. |
| 12 | Change request | 5 | `parseAssignee` rejects malformed ids, with a test for `../x`. The page test covers invalid params, back and forward. URL building is still inline in `update()` rather than a tested serialiser. |

**Total: 56/60**

---

## app-M (Pinia, hand-written fetching, no components)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 2 | (a) **Stale form:** `TicketFormView` only runs `onMounted(load)`, with no watch on `id`. Edit to New (header link) or edit to another edit keeps the old values, so a submit creates or edits with the wrong data. (b) `status` from the URL is never validated (`status: first(query.status)`) and goes straight to the API. (c) `Promise.all([..., users.load()])` on the detail and form pages, so `/users` failing breaks both. (d) `restore()` clears the session on any error, including a network blip. (e) Closed tickets stay in a filtered list. |
| 2 | Structure | 2 | `views/ lib/ stores/ api/` with no `components/` folder; inline `style="…"` attributes. |
| 3 | Components | 1 | No components at all. The form, comments, badges and table are all inline in three views of 114 to 170 lines. |
| 4 | Server data | 2 | `seq` guard on the list and detail only; the form has no guard and doesn't react to route changes. The optimistic close mutates the row object. No cache, abort or invalidation. |
| 5 | State | 4 | Pinia auth and users; the 401 handler is wired in `installGuards`. `users` is not reset on logout. |
| 6 | Reactivity | 3 | `onMounted(load)` + `watch(..., load)` instead of `immediate`; the form ignores prop changes; `ref(new Set())` mutated in place. The debounce is cleared on unmount. |
| 7 | Types | 2 | `ListFilters.status: string` and `TicketQuery.status?: string` drop the union; `v as LocationQuery[string]`; `as T`. |
| 8 | Errors / UX | 3 | Loading, empty and error with Retry; "Ticket not found."; 401 redirects back. `formatDate` has no guard against invalid dates. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` has no backslash check, and `startsWith('/login')` also blocks paths like `/loginx`. |
| 10 | Accessibility | 2 | Labels exist, but no `aria-invalid`, no `aria-describedby`, and form-field errors are not announced. |
| 11 | Tests | 3 | Validation, query parsing, optimistic logic (on a plain object), the auth store via `fetch` spy, the guard, and URL building in the client. No component tests. |
| 12 | Change request | 3 | `buildListQuery(route.query, patch)` merges the raw current query, so junk keys are carried forward. Status still unvalidated; `page=2.7` becomes 2. No back/forward test. |

**Total: 30/60**

---

## app-Q (Pinia for auth only, composables)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Correctness | 3 | (a) The page clamp runs `watch([pageCount, loading]) → setFilters({page})`, which uses `router.push`, not `replace`. Each clamp adds a history entry, so Back lands on the bad page and clamps again, trapping the user. (b) The `useUsers` cache is a module-level singleton that is never reset on logout, and `nameOf` falls back to the raw id. (c) Closed tickets stay in a filtered list. |
| 2 | Structure | 3 | Folders by type, but with real composables (`useTicketList`, `useCloseTicket`, `useUsers`) and `router/guard.ts`. |
| 3 | Components | 3 | `TicketForm` takes a `submit: (input) => Promise<void>` function prop instead of emitting, so the form owns API error handling. `CommentSection` fetches its own data. Largest: 177 lines. |
| 4 | Server data | 3 | `useTicketList(query: MaybeRefOrGetter)` has a `seq` guard; `replaceTicket` swaps in the server copy immutably; rollback applies a snapshot. No cache, abort or invalidation. |
| 5 | State | 3 | Auth is in Pinia; the users list is in a module-level `shallowRef`, outside Pinia and never cleared, so state is split across two systems. |
| 6 | Reactivity | 4 | Consistent `shallowRef` use; `toValue(query)` in the composable is the correct pattern; the timer is cleared. `watch(() => ({...toValue(query)}), …, {deep:true})` is redundant. |
| 7 | Types | 3 | `TicketInput.status?` mixes the create and patch shapes; `value as TicketStatus` in a template; a cast in `parseListQuery`; `data as T`. |
| 8 | Errors / UX | 4 | `notFound` state plus `NotFoundView`; `restore()` rethrows network errors (status 0) instead of logging out; 401 redirects back. |
| 9 | Security | 3 | Token in `localStorage`. `safeRedirect` is minimal: no `\` check and no `/login` exclusion. The previous user's directory stays in memory after logout. |
| 10 | Accessibility | 3 | Labels wrap inputs, `aria-invalid` is set, but errors have no `aria-describedby` and are not announced; filters use `aria-label`; identical close buttons. |
| 11 | Tests | 3 | One logic spec (validation, optimistic, guard, query) and the `TicketForm` component, including 422 handling. No list, store or composable tests. |
| 12 | Change request | 3 | Extracted `ticketQuery.ts` with a round-trip test. No component or back/forward test; a cast in the test; unformatted code (`timer =setTimeout`, `hasErrors,validateComment`). |

**Total: 38/60**

---

## Scores and ranking

| Criterion | B | D | F | H | M | Q |
|---|---|---|---|---|---|---|
| 1 Correctness | 4 | 3 | 4 | 4 | 2 | 3 |
| 2 Structure | 3 | 3 | 4 | 5 | 2 | 3 |
| 3 Components | 4 | 2 | 5 | 4 | 1 | 3 |
| 4 Server data | 3 | 3 | 5 | 5 | 2 | 3 |
| 5 State | 4 | 4 | 5 | 5 | 4 | 3 |
| 6 Reactivity | 4 | 4 | 5 | 5 | 3 | 4 |
| 7 Types | 4 | 3 | 5 | 4 | 2 | 3 |
| 8 Errors/UX | 4 | 3 | 4 | 5 | 3 | 4 |
| 9 Security | 4 | 3 | 5 | 5 | 3 | 3 |
| 10 A11y | 4 | 3 | 5 | 4 | 2 | 3 |
| 11 Tests | 3 | 4 | 5 | 5 | 3 | 3 |
| 12 Change request | 4 | 5 | 5 | 5 | 3 | 3 |
| **Total** | **45** | **40** | **57** | **56** | **30** | **38** |

1. **app-F: 57**
2. **app-H: 56.** Essentially tied with F. H has the better structure, query-param validation and 404 handling; F wins on purer components, typed form errors and focus management.
3. **app-B: 45**
4. **app-D: 40**
5. **app-Q: 38**
6. **app-M: 30**

---

## The three most important differences between app-F (best) and app-M (worst)

### 1. Optimistic close: shared cache with guarded rollback vs mutating a local object
F updates every cached copy of the ticket, rolls back only if nothing newer has arrived, and refetches afterwards. A closed ticket therefore leaves a `status=open` list, and the detail and list views agree.

```ts
// app-F  features/tickets/useCloseTicket.ts
onMutate(ticket) {
  queryCache.cancelQueries({ key: TICKET_KEYS.root })
  …setQueryData(TICKET_KEYS.byId(ticket.id), withTicketClosed(detail))
  queryCache.setQueriesData({ key: TICKET_KEYS.lists }, (page) =>
    mapTicketInPage(page, ticket.id, withTicketClosed))
},
onError(_e, ticket) { /* rollbackTicket(current, ticket): only if still our optimistic value */ },
onSettled: () => queryCache.invalidateQueries({ key: TICKET_KEYS.root }),
```

M flips a field on whichever object the view holds. Nothing else learns about it, and nothing is refetched.

```ts
// app-M  lib/optimistic.ts
() => { ticket.status = 'closed' },
() => { ticket.status = previous },
() => update(ticket.id, { status: 'closed' }),
```

### 2. Form: reusable, accessible component vs inline form with a stale-data bug
F has a pure `TicketForm` (users passed as a prop, typed emits). It ties each error to its input and moves focus to the first invalid field, and create and edit are separate pages.

```vue
<!-- app-F  features/tickets/TicketForm.vue -->
<input :id="`${uid}-title`" v-model="draft.title"
  :aria-invalid="errorFor('title') ? 'true' : undefined"
  :aria-describedby="errorFor('title') ? `${uid}-title-err` : undefined" />
<span v-if="errorFor('title')" :id="`${uid}-title-err`" class="error">…</span>
```

M puts the form inline in a view shared by two routes and loads it only once. Going from Edit to the header's "New ticket" keeps the old values, so submitting creates a duplicate. Its errors are also invisible to screen readers.

```ts
// app-M  views/TicketFormView.vue
onMounted(load)                       // no watch on props.id; Vue reuses this instance
…
<input id="title" v-model="form.title" />
<span v-if="errors.title" class="error">{{ errors.title }}</span>
```

### 3. Untrusted input: checked at the boundary vs passed straight through
F parses every API response and every URL value into precise types before using it.

```ts
// app-F  features/tickets/listParams.ts / model.ts
status: isStatus(status) ? status : '',
export function isStatus(value: unknown): value is TicketStatus { … }
export function parseTicket(value: unknown): Ticket { if (!isRecord(value) || !isStatus(value.status) …) return bad('ticket') … }
```

M types `status` as a plain `string`, sends whatever is in the URL to the API, and copies every existing query key into the next URL.

```ts
// app-M  lib/ticketQuery.ts
export interface ListFilters { q: string; status: string; assigneeId: string; page: number }
status: first(query.status),
const next: Record<string, unknown> = { ...current, ...patch }   // junk keys survive
```