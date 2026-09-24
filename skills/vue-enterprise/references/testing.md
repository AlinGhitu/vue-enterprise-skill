# Testing

Source tags: [docs] vuejs.org / test-utils / Pinia / Pinia Colada · [MT] Michael Thiessen · [VS] Vue School · [AF] Anthony Fu · [MO] Markus Oberlehner · [GL] GitLab · [CB] open-source codebases.

## What to test where [docs, MT, VS, MO, GL]

Choose the mix per project; no shape fits every codebase. Default allocation:

| Layer | Test with | Assert |
|---|---|---|
| Pure business functions (reducers, utils, from thin composables) | Vitest, no Vue | inputs → outputs, edge cases |
| Composables | Vitest; call directly if pure reactivity, else mount in a host component | refs react to inputs; cleanup runs on unmount |
| Pinia stores | Vitest + fresh Pinia per test | each test asserts one outcome: state changed, another action called, or a request made |
| Humble components | Vitest + Vue Test Utils (or Testing Library) | rendered output from props/slots; emitted events from user input |
| Controller components / views | VTU, network mocked with MSW | loading / error / empty / ready states |
| Critical user flows (login, checkout, main CRUD) | Playwright (or Cypress) | the flow completes; one case per past regression |

- Behaviour inside one component → component test. Behaviour across components or pages, or needing heavy mocking → browser-level test. ⚖ Oberlehner weights browser-level application tests (with the backend stubbed) over component tests; shift the balance that way when UI logic is simple.
- TypeScript already covers shape errors. Don't write tests that only prove a mock returns what you told it to, or that re-test Vue itself.
- Hard-to-test code is a design signal. Push logic into pure functions and humble components instead of adding mocks.
- Every bug fix ships with a regression test; every new component or composable ships with its tests in the same change.

## Global setup [GL, MO, docs]

- **Fail on unexpected console output:** a setup file makes any `console.error` or `console.warn` (Vue warnings included) fail the test. Allow-list specific messages sparingly. Unexpected warnings are bugs.
- **MSW:** `server.listen({ onUnhandledRequest: 'error' })` in the setup file, `resetHandlers()` after each test, `close()` after all. A request with no handler fails loudly.
- **Auto-unmount:** `enableAutoUnmount(afterEach)` from VTU, so listeners, intervals and third-party instances don't leak between tests.
- **Mocks:** `mockReset: true` (resets implementations as well as call history) and `restoreMocks: true` (restores `vi.spyOn` originals) in the Vitest config. Recent Vitest clears call history by default, but not implementations. Type every mock at its declaration: `vi.fn<(id: string) => Promise<Invoice | null>>()` (one function-type generic; the old two-generic form is gone) and `vi.mocked(fn)` for imported functions; a bare `vi.fn()` types as an untyped mock.
- **Typed handlers:** MSW handlers carry the contract, `http.get<{ id: string }, never, Invoice>('/api/invoices/:id', …)`, so a fixture that drifts from the response type fails to compile instead of passing silently. Factories return the domain type (`makeInvoice(overrides?: Partial<Invoice>): Invoice`).
- **Determinism:** fix the clock globally without faking timers: `vi.useFakeTimers({ toFake: ['Date'] })` plus `vi.setSystemTime(…)` in the setup file. Fake the other timers only inside tests about debounce, polling or timeouts, and advance them with `await vi.advanceTimersByTimeAsync(ms)`. Plain `vi.useFakeTimers()` in every test freezes all `setTimeout`/`setInterval` calls in the code under test and its libraries (debounces, polling, transition timeouts, MSW's `delay()`), so tests that depend on them hang or pass without running the timer. (`flushPromises()` keeps working either way: VTU captures the real scheduler when it is imported.) Never fake `queueMicrotask`: Node's `fetch`, and with it MSW, needs it. Stub `Math.random` when the code uses it. Reset shared state (query cache, stores, mocked module refs, location) in the top-level `beforeEach`.
- **Coverage:** collect it in CI (`@vitest/coverage-v8`) and gate **changed lines**, not a global percentage: new and changed code at least 80% covered, checked by Codecov patch status or `diff-cover` (Vitest's own `coverage.thresholds` are global or per file only). Exclude generated code (API clients, route maps). Coverage finds untested code; it doesn't prove behaviour, so never write a test only to raise the number.
- Keep a shared `test/utils.ts`: a project `mount` wrapper with the app's plugins and default providers, plus fixture factories. One seam, one style, hundreds of consistent tests.

## Component tests [docs, VS, GL]

- Test the **public interface**: props, slots and user events in; rendered output and emitted events out. Never assert private state or call internal methods.
- Select by role and accessible name first (Testing Library `getByRole('button', { name: 'Save' })`; with plain VTU, `find('button[aria-label=…]')` or text), then label or text, and `data-testid` only when nothing semantic fits. Never CSS classes, DOM structure or template refs.
- To simulate a **child component's** event, emit it from the child: `wrapper.findComponent(ChildForm).vm.$emit('save', payload)`. `trigger` only works for native DOM events. This is the one routine use of `.vm`.
- Read child props with `findComponent(Child).props('x')`.
- Set props through mount options; `setProps` only when testing reaction to a prop change. Never `setData`.
- One behaviour per test; Arrange–Act–Assert; put conditions in `describe('when the request fails')` blocks.
- `await` every `trigger`/`setValue`; `await flushPromises()` for pending promises.
- Prefer `mount` with targeted `global.stubs` over `shallowMount`. Shallow tests pass while the real composition breaks. ⚖ GitLab defaults to `shallowMount` for per-component tests; VTU's docs favour `mount`.
- Assert against literals, not imported constants: `expect(button.text()).toBe('Save')`. An `undefined` constant passes silently otherwise.
- Avoid weak matchers: no `toBeTruthy`/`toBeFalsy`, no `toBeDefined()` on finders (`null` passes). Use `exists()).toBe(true)`, `toHaveLength`, exact values.
- Test the loading state with a deferred promise you resolve inside the test.
- Test cleanup explicitly when a component registers global listeners: unmount, then assert the listener or timer is gone.
- Snapshots only as a supplement; never for logic.
- Test compound components (Tabs + TabPanel) together.
- Accessibility: run axe-core on each component state (default, disabled, error, empty). `vitest-axe` wraps it but is pre-1.0; check it works with the project's Vitest version, or call `axe-core` directly.

## Test data and mocking [MO, GL, VS]

- Mock at the network (MSW v2 `http`/`HttpResponse`) or at your own adapter modules. Never mock Vue itself or the business logic under test.
- Hide mock setup behind domain-named **precondition** helpers, so tests state behaviour and never mention endpoints: `await userCanCreateInvoice()` wraps `server.use(http.post('/api/invoices', …))`.
- Build fixtures from real backend responses (recorded, or generated from the API schema), not hand-written JSON that drifts from the API.
- Write the unhappy shapes too: empty list, missing item, partial fields, error responses.
- Dependency injection through `provide` or adapter modules beats deep module mocking.

## Composables with lifecycle or inject [docs]

```ts
import { createApp, type App, type InjectionKey } from 'vue'

type Provision = readonly [key: InjectionKey<unknown> | string, value: unknown]

export function withSetup<T>(composable: () => T, provisions: readonly Provision[] = []): readonly [T, App] {
  let result!: T                                   // definite assignment: allowed in test code
  const app = createApp({ setup() { result = composable(); return () => null } })
  for (const [key, value] of provisions) app.provide(key, value)   // provide BEFORE mount
  app.mount(document.createElement('div'))
  return [result, app]                             // app.unmount() in the test triggers onUnmounted / onScopeDispose
}
```

## Pinia and Pinia Colada [docs, GL]

- Store unit tests: `setActivePinia(createPinia())` in `beforeEach`. If the store relies on Pinia plugins, install the Pinia on a dummy `createApp({})`, because plugins only run once Pinia is installed in an app.
- Component tests with stores: `createTestingPinia({ initialState, createSpy: vi.fn })` in `global.plugins` (`createSpy` is required without Vitest globals). Actions are stubbed and spied by default; arrange state by assigning it; don't mock getters, set the state that produces them.
- In setup stores, a stubbed action is still called for real when another action calls it through the closure. Inside the store, call sibling actions through the store (`useInvoiceStore().load()`) when tests need to stub them, or test the real implementation.
- **Components using Pinia Colada:** mount with `plugins: [createPinia(), PiniaColada]` and mock the network with MSW. **Never** `createTestingPinia()` there: stubbed actions break Colada's internal stores.

## Router [docs, GL]

- Keep the router out of most component tests by design. Pages parse params and pass typed props ([routing](routing.md)), so controllers and humble components are tested with props. A humble component that renders `<RouterLink>` gets `global.stubs: { RouterLink: RouterLinkStub }`, and the test asserts `findComponent(RouterLinkStub).props('to')`.
- Pages, guards and navigation flows use a real router with the routes under test and `createMemoryHistory()`, installed through `global.plugins`. `await router.push(…)` and `await router.isReady()` before mounting and before asserting.
- When a component reads `useRoute()`/`useRouter()` incidentally and you only need to control them, mock the module per test (`vi.mock('vue-router')` with typed `vi.mocked(useRoute).mockReturnValue(…)`). ⚖ VTU's guide presents mocking as the common approach. This skill prefers props and a real router for pages, because param parsing and guards are behaviour worth testing.

## Feature flags [GL]

- Test flagged code with the flag both on and off.

## Browser-level tests [MO, GL, docs]

- **Log in once, not per test.** A Playwright setup project signs in and saves the session with `storageState` to `playwright/.auth/user.json` (gitignored); the browser projects declare `dependencies: ['setup']` and reuse it. Use one saved state per role.
- **Isolate data.** Each test creates what it needs through the API or a seed helper, with unique names, and never depends on another test's data or order. Tests run in parallel.
- Select by role and accessible name (`getByRole`), as in component tests. Wrap repeated flows in fixtures or small page helpers named after user intent (`await invoices.create({ … })`); keep assertions in the test.
- **Flakes:** `retries: 2` in CI only, 0 locally. A test that passed only on retry is reported and quarantined with an owner and a ticket, not left to keep retrying.
- Visual regression (`toHaveScreenshot`) only for design-system components and a few key pages, on a pinned browser and OS image; everywhere else, assert content.
- Choose the backend seam by architecture: an SPA intercepts browser requests (Playwright routing or MSW); an SSR monolith seeds a test database; an SSR app backed by microservices stubs the upstream services from their API contracts. Browser interception can't see server-to-server calls.
- Assert a stable end state that appears only once the action has settled (a status text, an alert), not transient button states. Use auto-waiting assertions; never sleep.
- Re-run axe after every structural change in a flow (dialog opened, section rendered).
