# Error handling

Source tags: [docs] vuejs.org / Pinia Colada / Vue Router · [MT] Michael Thiessen · [VS] Vue School · [GL] GitLab · [CB] open-source codebases.

Handle each error at the layer that has the context to act on it. Report the **unexpected** ones to monitoring.

## Expected vs unexpected [GL]

- **Expected** errors are part of normal use: validation failures, a 404 for a deleted item, a permission denial, the user going offline. Handle them in the UI and don't send them to monitoring.
- **Unexpected** errors are bugs or outages. Report them, with the `Error` object itself (never a string) so the stack survives.
- Monitoring full of expected errors stops being read.

## Layer 1 — where the work happens [VS, GL]

- API functions and composables catch, enrich and **rethrow**, or return `{ data, error }`. They never swallow silently.
- Rethrow with context and keep the original: `throw new ApiError('Loading invoices failed', { cause: err, status, endpoint })`.
- Define a small set of error classes (`ApiError`, `ValidationError`, `NotFoundError`) with consistent fields, and translate HTTP responses into them at the API layer.
- A caught value is `unknown`: anything can be thrown. Narrow it with `instanceof` before reading fields, or convert it with the shared `toError` helper when you need an `Error`. Never cast with `as Error`.

```ts
// shared/lib/errors.ts
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(typeof value === 'string' ? value : 'Non-Error value thrown', { cause: value })
}
```
- Keep two kinds of API error apart. **Transport** errors (network failure, 500, malformed request) get a generic message; never show the raw server text. **Domain** errors the API returns for users (validation messages, business-rule violations) are meant to be shown, and should arrive as structured data (field, code, message).

## Layer 2 — the component [VS, CB, docs]

- Views render the error state explicitly: inline messages for local problems, a toast for transient app-wide ones, a full error view when a route can't load its data, and a banner over stale data when a refetch fails.
- Map backend error codes to i18n keys (`errors.${code}`) in **one** helper that also shows the toast. Every `catch` then makes one call, and messages stay consistent and translatable.
- Map server validation errors onto the form fields they belong to (see [forms](forms.md)).
- Include a retry action where retrying makes sense.

## Layer 3 — error boundaries [docs, VS]

- Vue has no built-in boundary component. Build one `ErrorBoundary` with `onErrorCaptured`. It catches errors from descendants' render, setup, lifecycle hooks, watchers, event handlers, and directive and transition hooks.

```ts
const error = shallowRef<Error | null>(null)
onErrorCaptured((err) => {   // err is unknown
  error.value = toError(err)
  report(error.value)  // still send it to monitoring, as an Error
  return false         // stop propagation to app.config.errorHandler
})
```

- The template shows an error slot with a reset (`error.value = null`) and a "Try again" button, and renders the default slot otherwise. Never re-render the subtree that just threw without resetting it, or it will loop.
- Put boundaries around risky subtrees (third-party widgets, charts, lazy-loaded or data-heavy panels, each route view), not around every component.
- `<Suspense>` doesn't handle errors. Put the boundary in the parent of the `<Suspense>`.
- Nuxt has `<NuxtErrorBoundary>`; use it instead of a hand-built one.

## Layer 4 — global handlers [docs, MT, GL]

- Register `app.config.errorHandler = (err, instance, info) => { … }` before `mount`, and forward to monitoring. It receives errors from the same sources as `onErrorCaptured`.
- In production, Vue only logs unhandled errors to the console, so without an `errorHandler` they vanish. (Vue 3.5+ can also rethrow them with `app.config.throwUnhandledErrorInProduction = true`.)
- In production `info` is a short code, not a message; look it up in Vue's production error reference.
- Listen for `unhandledrejection` on `window`: a promise rejected outside Vue's call paths never reaches the `errorHandler`.
- Register `router.onError`: failed lazy-route chunk loads and data-loader errors arrive there, not in boundaries.
- Query and mutation errors can be handled centrally in Pinia Colada's global hooks (see [server data](server-data.md)).
- `app.config.warnHandler` runs in development only.

## Monitoring [GL]

- Wrap the monitoring SDK in one module (see [architecture](architecture.md)). In local development it prints to the console instead of sending.
- Tag every event with the owning feature and the page. Shared code (navigation, global search) tags its own owner, so errors reach the team that owns the code.
- Never send secrets or personal data in error messages or context.

## Messages [VS, GL]

- Users get friendly, actionable text through i18n. Stack traces and raw transport errors are for development builds and monitoring.
