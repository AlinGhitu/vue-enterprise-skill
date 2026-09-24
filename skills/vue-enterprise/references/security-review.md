# Security review procedure

Use this when asked to review a Vue or Nuxt app (or a change to one) for security. The rules being checked live in [security](security.md), [supply-chain](supply-chain.md) and [server data](server-data.md); this file is the procedure and the report format.

## Ground rules

1. Report **exploitable** problems, not theoretical ones. If you can't describe how an attacker reaches it, it's a note, not a finding.
2. Every finding carries a specific, actionable fix.
3. Critical and High findings include a proof of concept or a concrete exploitation scenario (the input, the path it takes, the effect).
4. Name good practices you saw. A review that only lists problems trains people to hide things.
5. OWASP Top 10:2025 is the minimum baseline; for AI features, add the OWASP LLM Top 10.
6. Review dependencies and CI, not just app code.
7. Never propose disabling a security control as a fix (turning off CSP, adding `unsafe-eval`, widening `server.fs.allow`, skipping sanitization). Fix the code that conflicts with the control.
8. Start from trust boundaries and reason with STRIDE before enumerating findings.

## Step 1 — Map the trust boundaries

Read `package.json`, the router, the API layer, `vite.config`/`nuxt.config`, CI workflows and the deploy config. For each boundary below, find where untrusted data enters and every sink it can reach:

| Boundary | Untrusted data | Typical sinks |
|---|---|---|
| User input → DOM | form fields, pasted content, uploaded files | `v-html`, `innerHTML`, `:href`/`:src`, `:style` strings, `v-bind="obj"` |
| URL → app | query, hash, params, `redirect=` | navigation, `v-html`, API calls, state merges |
| API response → app | JSON bodies, error messages | rendered markup, deep merges into stores, error toasts |
| Storage → app | `localStorage`, IndexedDB, cookies readable by JS | state hydration, merges |
| Third-party script → page | vendor JS, widgets, tag managers | the whole DOM and every JS-readable secret |
| `postMessage` / iframe → app | messages from embedded or embedding pages | handlers that assign into state or call APIs |
| SSR → client | hydration payload, cached responses, forwarded headers | `<script>` injection, cross-user leaks |
| LLM output → DOM | model text, tool results, retrieved documents | markdown rendering, links, images, executed actions |
| Package registry / CI → build | dependencies, Actions, tokens | developer machines, CI secrets, the shipped bundle |

## Step 2 — STRIDE each boundary

For each boundary ask which of these apply, with a concrete example:

- **Spoofing** — can something pretend to be the app, a partner frame, or the user? (fake in-app routes, unverified `postMessage` origins, ID tokens sent as bearer tokens)
- **Tampering** — can data be changed on the way in or out? (unsanitized HTML, unvalidated redirects, `__proto__` keys merged into state, mutated CDN assets without SRI)
- **Repudiation** — can an action happen without a trace? (agent tool calls with no audit log, logins with no server-side session record)
- **Information disclosure** — what can leak, and to whom? (tokens in `localStorage`, secrets in `VITE_*`, sourcemaps in `dist/`, forwarded cookies on server-side fetches, PII in error trackers, cross-request SSR state)
- **Denial of service** — what can freeze the tab or exhaust a budget? (ReDoS in validators, unbounded lists from API data, unlimited LLM turns)
- **Elevation of privilege** — what runs with the user's or the app's authority? (XSS reads every JS-reachable token; a third-party script calls authenticated APIs; hidden UI treated as authorization)

## Step 3 — Walk the checklist

Answer each question with evidence (file and line). Items marked **server** can't be verified from the frontend: state what the frontend assumes and list them as questions for the backend team rather than as findings.

### Input handling — A05 Injection, A06 Insecure Design
- Is every `v-html` fed by the one sanitizer module, with its lint disable comment naming it? Any `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or string-argument timers?
- Are user-controlled URLs scheme-checked before `:href`/`:src`/`NuxtLink`/`navigateTo`? Are `?redirect=`/`?next=` values allow-listed?
- Does user data ever reach `:style` as a string, `v-bind="obj"`, or an `on*` attribute?
- Are uploads type- and size-checked client-side for UX, and are previews of user files (SVG especially) rendered from a separate origin or after server-side re-encoding? Server-side validation: **server**.
- Is untrusted JSON (query params, storage, API) merged into state with a deep merge that could carry `__proto__`/`constructor`?
- Injection into SQL/NoSQL/OS/LDAP: **server** (Nuxt server routes count as server code: check `readValidatedBody`/`getValidatedQuery` there).

### Authentication and authorization — A01 Broken Access Control, A07 Authentication Failures
- Which RFC 10017 architecture is in use? If tokens are in the browser, why, and are they out of `localStorage`?
- Session cookie: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`? Set only by the server?
- CSRF: does the API client attach the required header or token on every mutating request? Is any state change reachable by `GET`?
- Do route guards and hidden UI stand in for server checks anywhere? Does any request carry an id or tenant the server might trust (IDOR)? Enforcement: **server**.
- Login form: generic failure message, no client-side lockout logic, correct `autocomplete`, paste allowed?
- Logout: server-side invalidation, `Clear-Site-Data`, client caches cleared, other tabs notified?
- Password hashing, reset-token lifetime, rate limiting, MFA enforcement: **server**.

### Data protection — A02 Security Misconfiguration, A04 Cryptographic Failures
- Any secret in `VITE_*`, `runtimeConfig.public`, or committed `.env`? Anything in `dist/` that shouldn't be (sourcemaps, `.env`, secrets)?
- Are sensitive fields kept out of console logs, error-tracker breadcrumbs and session replay? Is there one scrub point?
- Is PII cleared from stores, query cache and drafts on logout?
- Encryption at rest, backups, PII regulation compliance: **server / platform**.

### Infrastructure and headers — A02
- CSP: `script-src` nonce or hash with `'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors`; no `unsafe-eval`; `style-src 'unsafe-inline'` only if documented as the Vue trade-off.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy`, COOP, CORP present (from the edge or `nuxt-security`)?
- CORS allow-list, not a wildcard with credentials: **server**.
- Vite dev config: `server.cors`, `server.allowedHosts`, `server.fs.allow` widened? Dev server ever exposed beyond localhost?
- Error messages generic in production; `app.config.errorHandler` set; no raw server bodies in the UI.
- Least privilege for service accounts: **server / platform**.

### Third-party integrations — A03 Supply Chain, A08 Integrity
- Any CDN-loaded script or style without `integrity` + `crossorigin`? Any vendor script in the app's origin that could be an iframe?
- `postMessage` handlers: exact origin match and message-shape validation?
- OAuth flows: authorization code + PKCE, `state`, `nonce`, no implicit grant, no tokens in URLs?
- Lifecycle scripts blocked, `minimumReleaseAge` set, Actions SHA-pinned, `permissions:` minimal, lockfile committed, secret scanning on?
- Webhook signature verification and SSRF allow-lists for server-side fetches: **server** (Nuxt server routes included).

### AI / LLM features — OWASP LLM Top 10
- **LLM05** Output handling: is model output rendered through the sanitizer pipeline, never raw? Streaming re-sanitizes the full buffer? No routes, paths or code built from model text?
- **LLM01/LLM07/LLM08** Injection and prompt leakage: is imported or retrieved content visually separated from the assistant's words? Can any user-editable field reach the system prompt? Is the system prompt or tool schema visible in devtools?
- **LLM02** Disclosure: any provider key in the bundle or browser request? Prompts in client logs or replay?
- **LLM06** Agency: tool calls shown before execution, itemized confirmation for destructive or financial actions, tools hidden per role?
- **LLM10** Consumption: visible turn and token caps, send disabled while streaming, paste and upload sizes capped?
- Server-side output validation, permission-filtered retrieval, quotas: **server**.

## Step 4 — Report

Order findings by severity. For each:

```
[Severity] Title — OWASP category (and LLM category if relevant)
Location: file:line
Issue: what is wrong, in one or two sentences
Scenario: for Critical/High — the input, the path, the effect (a PoC request or payload where possible)
Fix: the specific change, code where useful
```

Severity guide: **Critical** — remote code execution, account takeover, cross-user data exposure with no preconditions. **High** — XSS reachable by another user, auth bypass, secret exposure. **Medium** — needs an unlikely precondition or a second bug, or a missing defense-in-depth control on a sensitive flow. **Low** — hardening, best-practice gaps with no direct exploit.

End with: good practices observed; server-side questions raised; what wasn't reviewed.
