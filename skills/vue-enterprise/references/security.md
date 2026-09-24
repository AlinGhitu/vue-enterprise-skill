# Security

Source tags: [docs] Vue, Vite, Nuxt, DOMPurify, MDN docs · [OWASP] Top 10:2025, ASVS 5.0, Cheat Sheet Series, LLM Top 10 · [IETF] RFC 10017 (OAuth for browser apps, BCP 212), RFC 9700, OpenID Connect Core · [GL] GitLab · [MO] Markus Oberlehner · [CB] open-source codebases (Directus, Vikunja, Elk, n8n, Nuxt UI, Element Plus, nuxt-security). Reviewing an app → [security review](security-review.md). Dependencies and CI → [supply chain](supply-chain.md).

Vue escapes `{{ }}` and attribute bindings. Every hole below is a place where code opts out of that, trusts the wrong party, or hands the browser something it will execute.

## Templates and DOM sinks [docs, OWASP, CB]

- **`v-html` only through the sanitizer module.** One reviewed DOMPurify configuration for the whole app; every `v-html` site carries `eslint-disable-next-line vue/no-v-html -- sanitized by sanitizeHtml`. Sanitize at render time even if the server sanitized before storing. Never `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or string-argument timers with untrusted data. Rich text is better stored as Markdown or structured JSON and rendered through the same pipeline.
- **Library exception:** a reusable component library may expose an unsanitized opt-in prop, named to say so (`dangerouslyUseHtmlString`), documented as "caller sanitizes". App code never uses such a prop with untrusted content. [CB]
- Never compile a user-supplied string as a template (`template:` option, `compile()`), and never mount Vue onto server-rendered HTML that contains user content. Both are arbitrary code execution and Vue's team doesn't treat them as Vue bugs.
- **URLs:** scheme allow-list (`https:`, `mailto:`) before any user value reaches `:href`, `:src`, `formaction`, `<NuxtLink :to>`, `navigateTo()` or `reloadNuxtApp()`. Sanitize on the server before storing too: Vue's docs say frontend-only URL sanitization already means "you have a security issue". `@braintree/sanitize-url` collapses `javascript:` variants to `about:blank` as a client fallback.
- **Styles:** bind user values to named properties (`:style="{ color }"`), never a style string. A free-form style enables clickjacking overlays.
- Never bind user data to `on*` attributes, and never `v-bind="obj"` with an object from user data (it can set any attribute, handlers included). Pick fields explicitly.
- Preview user-uploaded SVG or unknown file types from a separate cookie-less origin or after server-side re-encoding, never inline in the app's DOM. Client-side type and size checks are UX; the server validates.
- **Prototype pollution:** never deep-merge untrusted JSON (query params, storage, API bodies) into state with a generic recursive merge. Validate with a schema first, and reject `__proto__`, `constructor` and `prototype` keys; `structuredClone` and `Map` are safe containers. Watch custom merge helpers feeding `$patch`.
- **DOM clobbering:** where third-party or user HTML shares the page, never read config from bare `window.x` lookups; declare variables and check types. Injected markup with a matching `id` or `name` shadows undeclared globals.
- Vue 2 is EOL with an unpatched prototype-pollution XSS in `vue-template-compiler` (CVE-2024-6783). Migrate.

```ts
// shared/lib/sanitize.ts — the only file that imports DOMPurify or marked
import type { TrustedHTML } from 'trusted-types/lib'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    if (!/^(https?:|mailto:)/i.test(node.getAttribute('href') ?? '')) node.removeAttribute('href')
    node.setAttribute('rel', 'noopener noreferrer')   // force it; ADD_ATTR alone can leave a bare target=_blank
    node.setAttribute('target', '_blank')
  }
})
const CONFIG = { USE_PROFILES: { html: true }, ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i }   // one policy for every entry point

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, CONFIG)
}
export function sanitizeHtmlTrusted(dirty: string): TrustedHTML {   // under require-trusted-types-for 'script'
  return DOMPurify.sanitize(dirty, { ...CONFIG, RETURN_TRUSTED_TYPE: true })
}
export function renderMarkdown(raw: string): string {
  return sanitizeHtml(marked.parse(raw, { async: false }))          // marked does not sanitize
}
```

A `v-safe-html` directive wrapping `sanitizeHtml` keeps call sites free of `v-html` entirely. Don't post-process the sanitizer's output with string replacement; that reopens mutation XSS.

## CSP and headers [docs, OWASP, CB]

- `script-src` with a per-response nonce (`html.cspNonce` in Vite, regenerated on **every** request; reusing a nonce defeats it) or per-build hashes, plus `'strict-dynamic'`. Always `object-src 'none'` and `base-uri 'none'`. A static host with no server can only do hashes.
- **Never `'unsafe-eval'`.** The runtime template compiler needs it; ship the runtime-only build (the default with SFCs) and keep `vue.runtimeCompiler` off in Nuxt. This also closes the 2026 Nuxt server-island RCE.
- **`style-src` is the honest compromise.** Vue writes inline `style` attributes at runtime for `:style`, `v-show`, `v-bind()` in CSS and transitions, and a nonce can't cover an attribute. Budget `style-src 'unsafe-inline'` (or CSP3 `'unsafe-hashes'` where supported) and keep `script-src` strict. "No inline styles" isn't achievable with Vue.
- Vite inlines small assets as `data:` URIs: allow `data:` in `img-src`/`font-src` or set `build.assetsInlineLimit: 0`. Never allow `data:` in `script-src`.
- `frame-ancestors 'self'` (or `'none'`) is the clickjacking control; `X-Frame-Options` is obsolete and a JS frame-buster is bypassable.
- The rest of the header set, from the edge or from `nuxt-security`: `Strict-Transport-Security` (≥ 1 year, `includeSubDomains`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (or stricter), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy`, a restrictive `Permissions-Policy`. `nuxt-security`'s defaults are a sound baseline and include nonce-based CSP and SRI.
- **Trusted Types:** with `require-trusted-types-for 'script'`, Vue automatically registers a policy named `vue` for its own `innerHTML` writes, so the `trusted-types` directive must allow `vue` plus your sanitizer's policy (`dompurify`). Values you hand to `v-html` must already be `TrustedHTML` (`RETURN_TRUSTED_TYPE: true`).
- Check the policy with `csp-evaluator` or Lighthouse's `csp-xss` audit, and headers with `npx @mdn/mdn-http-observatory <host>`.

## Secrets and build output [docs, CB]

- Everything under `import.meta.env.VITE_*` and Nuxt `runtimeConfig.public` ships to the browser. Server secrets live in server-only `runtimeConfig` keys or the server's environment, never re-exposed through `useState` or a render.
- Nuxt env overrides must match the key exactly (`NUXT_API_SECRET`, `NUXT_PUBLIC_API_BASE`); a mismatched name works at build time and silently fails in production.
- `build.sourcemap` stays `false`, or `'hidden'` with the `.map` files uploaded to the error tracker and stripped from the deployed `dist/`. Fail CI if `dist/` contains `.map` files or anything a secret scanner flags.
- Validate `VITE_*` variables against a schema at build time (`@julr/vite-plugin-validate-env`) so a missing value fails the build instead of shipping `undefined`.

## Vite dev server [docs]

- Never `server.cors: true` or `server.allowedHosts: true`; don't widen `server.fs.allow`; keep `fs.strict` on. `server.fs.deny` has a long line of published bypasses (a dozen or more distinct techniques since 2022 — query strings, encodings, Windows paths, the HMR WebSocket), so treat a dev server reachable from a network as an open file read of the project, including `.env`. Keep Vite patched and never expose it with `--host` on a shared network.
- The dev server is never a production server.

## Authentication and sessions [IETF, OWASP, CB]

- **Architecture first (RFC 10017).** The BFF pattern, where your backend is the OAuth client, holds the tokens and the browser holds only a session cookie to its own backend, is "strongly recommended for business applications, sensitive applications, and applications that handle personal data". Default to it. Nuxt server routes are a BFF; `nuxt-auth-utils` gives sealed session cookies with a server-only `secure` sub-object for tokens (`NUXT_SESSION_PASSWORD` ≥ 32 chars, set explicitly in production).
- Tokens in the browser only when there is no backend to hold them, or when the same API serves non-browser clients (a desktop or CLI client). Then: authorization code + PKCE, tokens in memory, never refresh tokens in `localStorage`, and a hardened CSP because one XSS reads everything JS can read. The choice is an architecture, not a storage tip: "prefer cookies" alone doesn't answer it.
- **Session cookie:** `__Host-session`, `Secure`, `HttpOnly`, `Path=/`, `SameSite=Lax`. `Strict` drops the cookie on the top-level redirect back from an identity provider or an email link, so users "log in" and land logged out. `SameSite=None` only for embedded widgets, and then with `Partitioned`.
- **CSRF is partly frontend work.** The backend picks the scheme; the frontend attaches whatever it needs (a custom header on every mutating request, or a `__Host-` double-submit token) in **one** API-client interceptor, and never strips `Origin` or custom headers in a fetch wrapper. No state change is ever reachable by `GET`; `SameSite=Lax` doesn't stop those.
- **OAuth/OIDC when the browser talks to the identity provider:** PKCE is a MUST for public clients; the implicit grant is SHOULD NOT (RFC 9700) and has no place in new code; `state` and `nonce` on every request; no tokens in URLs. Refresh tokens for public clients must be rotated per use or sender-constrained (DPoP/mTLS); with rotation, refresh single-flight: on 401, one refresh attempt, then redirect to login. An ID token's audience is the client (OpenID Connect Core), so it is never sent to an API as a bearer token; only access tokens are.
- **Login forms:** real `<form>` fields with `autocomplete="username"` / `"current-password"` / `"new-password"`; paste allowed; no client-side length cap below 64; one generic failure message; no client-side lockout or attempt counting (rate limits are server-side, per account); forgot-password shows the same confirmation whether or not the account exists; MFA codes never logged or persisted.
- **Passkeys:** `@simplewebauthn/browser` `startRegistration`/`startAuthentication` with options fetched from the backend, which also verifies the response. Feature-detect (`browserSupportsWebAuthn()`); add `webauthn` last in the username field's `autocomplete` for conditional UI.
- **Authorization in the UI is display logic.** The server re-checks every request against the session's user. Never trust an id or a tenant the client sends (IDOR); opaque ids don't replace the check. Render permission-gated UI from a permission list the server sends, and refetch it on role or tenant change.
- **Logout and lifecycle:** the server invalidates the session and answers with `Clear-Site-Data: "cache", "cookies", "storage"`; the client resets stores, the query cache and drafts holding personal data, and tells other tabs over `BroadcastChannel`. Session ids regenerate on login, MFA step-up and role change. Session timeout is server-enforced; the client only shows the warning. When a session expires mid-form, re-authenticate in a modal or keep the draft so the user's work survives.
- `Cache-Control: no-store` on responses that carry session-specific data.

## SSR and Nuxt server routes [docs, OWASP]

- Validate every server-route input with a schema: `readValidatedBody(event, schema.parse)`, `getValidatedQuery`, `getValidatedRouterParams`. Nuxt server routes are server code; all backend rules apply there (injection, authorization on every handler, rate limits, request size limits, SSRF allow-lists for outbound fetches).
- Never forward the incoming request's `cookie` or `authorization` headers to a third-party host. `useRequestHeaders(['cookie'])` is SSR-only and forwards verbatim to whatever `useFetch` calls; use it only for your own backend, with an explicit host allow-list in the fetch helper.
- Serialize SSR state with an escaping serializer (`devalue`), never `JSON.stringify` inside a `<script>`. That prevents payload XSS; it does **not** prevent cross-user leaks from a cache keyed only by path. Any `routeRules` cache for authenticated pages must vary on the auth dimension, and Nuxt must be patched (4.4.0–4.5.0 leaked payloads between users).
- Server islands, `NuxtLink`, `navigateTo` and `reloadNuxtApp` had 2026 CVEs (RCE with the runtime compiler on, DoS, auth-middleware bypass on mixed-case paths, reflected XSS and open redirects). Keep Nuxt current, validate URL schemes yourself, and treat route-rule middleware as one layer, not the authorization boundary.
- `nuxt-security` for headers, CSP nonces, request-size and rate limiting, and CSRF middleware where `SameSite` alone isn't enough.

## Redirects [OWASP]

- Never redirect to a raw `?redirect=`, `?next=`, or `RelayState` value. Allow-list destinations, or map a server-issued token to the real URL. Show an interstitial for cross-origin targets.

## Third-party scripts and embeds [OWASP, CB]

- Self-host by default. A CDN script or style gets `integrity` + `crossorigin="anonymous"` ([supply chain](supply-chain.md)).
- Widgets that need the page (chat, ads, tag managers) run in a sandboxed cross-origin `<iframe>` with `postMessage`, not as scripts in the app's origin where they read every JS-reachable token and form. Give vendors a curated data layer, never raw DOM, cookies or URL access.
- `postMessage` handlers check `event.origin` with an exact match (never `includes`), validate the message shape, and never assign the payload into state or globals unchecked. An empty allow-list must mean "same origin only", not "everyone".
- Untrusted HTML that must be shown in full (email bodies, LLM tool output): sanitize **and** render inside `<iframe :srcdoc sandbox="" referrerpolicy="no-referrer">`, so a sanitizer bypass still can't run script in the app's origin.
- Clear all client state on logout, including data the widget cached.

## Logging and errors [OWASP, GL]

- One scrub point (`beforeSend`, breadcrumb filter) removes tokens, passwords, session and CSRF ids and PII before anything reaches console, error tracker or session replay. Prompts and chat content are opt-in, never default.
- Users see generic messages; raw API bodies (stack traces, internal ids, query fragments) never render (see [errors](errors.md)).
- Strip newlines and delimiters from user-derived strings before logging them, or the aggregator gets log injection.

## AI and LLM features [OWASP LLM Top 10, CB]

OWASP LLM Top 10 category IDs below are the 2025 edition; a 2026 edition (published August 2026; PDF at genai.owasp.org) supersedes it and may renumber, so check IDs against it. Model output is attacker-influenceable through prompt injection even when the user is trusted.

- **Rendering (LLM05):** model output goes through `renderMarkdown` above, never raw `v-html`. When streaming, render plain text until a block completes, or re-sanitize the **full accumulated buffer** on every chunk; a tag split across chunks defeats per-delta sanitizing. Links keep the scheme allow-list and forced `rel`; images are proxied through your backend or stripped (a model can emit a tracking or exfiltration URL); code blocks are inert text, and a "Run" action needs a click and a sandbox. Never build a route, path, selector or component name from model text; only backend-validated structured tool calls drive behaviour.
- **Input and context (LLM01, LLM07, LLM08):** pasted, uploaded, fetched and retrieved content is shown in a visibly separate block from the assistant's own words, so injected instructions are visible as data. No user-editable field is prepended to the system prompt on the client; the backend owns it. Nothing in the production bundle, console or debug panel exposes the system prompt, tool schema or raw provider payloads. Show citations that link to the real source for retrieved claims (LLM09).
- **Keys and transport (LLM02, LLM10):** never call a model provider from the browser with a key; stream through your backend so it can rate-limit, redact, audit and cut a stream. Quota state is server state.
- **Agency (LLM06):** show a pending tool call (name and parameters) before it runs; require itemized confirmation naming the exact action, amount and target for destructive or financial actions; never auto-chain writes without a checkpoint; hide tools the role can't use (in addition to server enforcement); keep a visible log of executed actions.
- **Limits (LLM10):** visible turn and token caps with a clear stop; send and regenerate disabled while streaming; paste and upload sizes capped before submit.
- **Privacy (LLM02):** explicit consent before a document, screenshot or clipboard content enters a prompt, stating retention; chat history and drafts cleared on logout.

## Ask the backend [OWASP, IETF]

Frontend security depends on answers the frontend can't verify. Settle these in writing:

1. Which RFC 10017 architecture: BFF, token-mediating backend, or browser-based client?
2. Session cookie name, attributes and lifetime; the refresh contract and the exact status code for "re-authenticate".
3. The CSRF scheme and the header or token name the client must send.
4. Which endpoints take ids from the client, and confirmation that each re-checks ownership; how the active tenant is set and switched.
5. The redirect allow-list owner; the CORS allow-list; the error-body contract (no stack traces, stable codes).
6. Who sets which headers (CSP delivery: static header or per-request nonce?); log redaction policy shared by both sides.
7. For AI features: system-prompt ownership, output validation, permission-filtered retrieval, quotas and retention.

## Tooling [CB, docs]

- Lint: `vue/no-v-html` (error, disable per line with the sanitizer named), `vue/no-v-text-v-html-on-component`, `vue/no-template-target-blank`, `vue/no-restricted-syntax` for `innerHTML`; `eslint-plugin-no-unsanitized` for `.ts` files (it doesn't parse SFC templates); `eslint-plugin-security` with human triage (high false-positive rate).
- Static analysis: Semgrep with `p/xss` and `p/javascript` (the registry also has Vue template XSS rules under `javascript/vue/security`; check the current rule ids with `semgrep --config p/javascript --json`); CodeQL for JS/TS if the repo has GitHub Advanced Security.
- CI: secret scanning of history and `dist/` (gitleaks or trufflehog), `pnpm audit --audit-level=high --prod`, a sourcemap check on `dist/`, and nightly `@mdn/mdn-http-observatory` plus an OWASP ZAP baseline scan against staging (passive only; it won't find logic flaws).
- Keep a `SECURITY.md` with the disclosure contact.
