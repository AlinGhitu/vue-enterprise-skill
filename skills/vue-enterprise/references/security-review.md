# Security review procedure

Use this when asked to review a Vue or Nuxt app (or a change to one) for security. The rules being checked live in [security](security.md), [auth](auth.md), [AI features](ai-features.md), [supply-chain](supply-chain.md) and [server data](server-data.md); this file is the procedure and the report format.

## Ground rules

1. Report **exploitable** problems, not theoretical ones. If you can't describe how an attacker reaches it, it's a note, not a finding.
2. Every finding carries a specific, actionable fix.
3. Critical and High findings include a proof of concept or a concrete exploitation scenario (the input, the path it takes, the effect).
4. Name good practices you saw. A review that only lists problems trains people to hide things.
5. Baseline: OWASP Top 10:2025, plus the OWASP LLM Top 10 for AI features. Also map findings to ASVS 5.0.0: cite a requirement (`v5.0.0-3.5.5`) only after reading it in the ASVS text (github.com/OWASP/ASVS, `5.0/en`), otherwise the section (`ASVS V3.5`).
6. Review dependencies and CI, not just app code.
7. Never propose disabling a security control as a fix (turning off CSP, adding `unsafe-eval`, widening `server.fs.allow`, skipping sanitization). Fix the code that conflicts with the control.
8. Start from trust boundaries and reason with STRIDE before enumerating findings.
9. Review the code and config you were given. Send requests, scans or proof-of-concept payloads only to environments the user names and is authorized to test, never to production or third-party hosts. Keep secrets, tokens and personal data found during the review out of the report: cite the file and line, not the value.

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

### Input handling — A05 Injection, A06 Insecure Design · ASVS V1.2, V1.3, V3.2, V3.7, V5.2, V15.3
- Is every `v-html` fed by the one sanitizer module, with its lint disable comment naming it? Any `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or string-argument timers?
- Are user-controlled URLs scheme-checked before `:href`/`:src`/`NuxtLink`/`navigateTo`? Are `?redirect=`/`?next=` values allow-listed (`v5.0.0-3.7.2`)?
- Does user data ever reach `:style` as a string, `v-bind="obj"`, or an `on*` attribute?
- Are uploads type- and size-checked client-side for UX, and are previews of user files (SVG especially) rendered from a separate origin or after server-side re-encoding? Server-side validation: **server**.
- Is untrusted JSON (query params, storage, API) merged into state with a deep merge that could carry `__proto__`/`constructor` (`v5.0.0-15.3.6`)?
- Injection into SQL/NoSQL/OS/LDAP: **server** (Nuxt server routes count as server code: check `readValidatedBody`/`getValidatedQuery` there).

### Authentication and authorization — A01 Broken Access Control, A07 Authentication Failures · ASVS V3.3, V3.5, V6, V7, V8, V10
- Which RFC 10017 architecture is in use? If tokens are in the browser, why, and are they out of `localStorage`?
- Session cookie: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax` (`v5.0.0-3.3.1`, `v5.0.0-3.3.3`)? Set only by the server?
- CSRF: does the API client attach the required header or token on every mutating request? Is any state change reachable by `GET` (`v5.0.0-3.5.3`)?
- Do route guards and hidden UI stand in for server checks anywhere? Does any request carry an id or tenant the server might trust (IDOR)? Enforcement: **server**.
- Login form: generic failure message, no client-side lockout logic, correct `autocomplete`, paste and password managers allowed (`v5.0.0-6.2.7`), no length cap below 64 (`v5.0.0-6.2.9`)?
- Logout: server-side invalidation (`v5.0.0-7.4.1`), `Clear-Site-Data` and client caches cleared (`v5.0.0-14.3.1`), other tabs notified?
- Password hashing, reset-token lifetime, rate limiting, MFA enforcement: **server**.

### Data protection — A02 Security Misconfiguration, A04 Cryptographic Failures · ASVS V13.3, V13.4, V14.3, V16.2
- Any secret in `VITE_*`, `runtimeConfig.public`, or committed `.env`? Anything in `dist/` that shouldn't be (sourcemaps, `.env`, secrets)?
- Are sensitive fields kept out of console logs, error-tracker breadcrumbs and session replay? Is there one scrub point?
- Is PII cleared from stores, query cache and drafts on logout?
- Encryption at rest, backups, PII regulation compliance: **server / platform**.

### Infrastructure and headers — A02 · ASVS V3.4, V13.4, V16.5
- CSP (`v5.0.0-3.4.3`, `frame-ancestors` `v5.0.0-3.4.6`): `script-src` nonce or hash with `'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors`; no `unsafe-eval`; `style-src 'unsafe-inline'` only if documented as the Vue trade-off.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy`, COOP, CORP present (from the edge or `nuxt-security`)?
- CORS allow-list, not a wildcard with credentials: **server**.
- Vite dev config: `server.cors`, `server.allowedHosts`, `server.fs.allow` widened? Dev server ever exposed beyond localhost?
- Error messages generic in production (`v5.0.0-16.5.1`); `app.config.errorHandler` set; no raw server bodies in the UI.
- Least privilege for service accounts: **server / platform**.

### Third-party integrations — A03 Supply Chain, A08 Integrity · ASVS V3.5, V3.6, V10.2, V10.5, V15.2
- Any CDN-loaded script or style without `integrity` + `crossorigin` (`v5.0.0-3.6.1`)? Any vendor script in the app's origin that could be an iframe?
- `postMessage` handlers: exact origin match and message-shape validation (`v5.0.0-3.5.5`)?
- OAuth flows: authorization code + PKCE, `state`, `nonce`, no implicit grant, no tokens in URLs?
- Lifecycle scripts blocked, `minimumReleaseAge` set, Actions SHA-pinned, `permissions:` minimal, lockfile committed, secret scanning on?
- Webhook signature verification and SSRF allow-lists for server-side fetches: **server** (Nuxt server routes included).

### AI / LLM features — OWASP LLM Top 10 (ASVS has no chapter for these)
- **LLM05** Output handling: is model output rendered through the sanitizer pipeline, never raw? Streaming re-sanitizes the full buffer? No routes, paths or code built from model text?
- **LLM01/LLM07/LLM08** Injection and prompt leakage: is imported or retrieved content visually separated from the assistant's words? Can any user-editable field reach the system prompt? Is the system prompt or tool schema visible in devtools?
- **LLM02** Disclosure: any provider key in the bundle or browser request? Prompts in client logs or replay?
- **LLM06** Agency: tool calls shown before execution, itemized confirmation for destructive or financial actions, tools hidden per role?
- **LLM10** Consumption: visible turn and token caps, send disabled while streaming, paste and upload sizes capped?
- Server-side output validation, permission-filtered retrieval, quotas: **server**.

## Step 4 — Report

Order findings by severity. For each:

```
[Severity] Title — OWASP category (and LLM category if relevant) · ASVS requirement or section
Location: file:line
Issue: what is wrong, in one or two sentences
Scenario: for Critical/High — the input, the path, the effect (a PoC request or payload where possible)
Fix: the specific change, code where useful
```

Severity guide: **Critical** — remote code execution, account takeover, cross-user data exposure with no preconditions. **High** — XSS reachable by another user, auth bypass, secret exposure. **Medium** — needs an unlikely precondition or a second bug, or a missing defense-in-depth control on a sensitive flow. **Low** — hardening, best-practice gaps with no direct exploit.

End with: good practices observed; server-side questions raised; what wasn't reviewed.
