# AI features

Source tags: [OWASP LLM Top 10] · [CB] open-source codebases. Security rules for the rest of the app → [security](security.md).

OWASP LLM Top 10 category IDs below are the 2025 edition; a 2026 edition (published August 2026; PDF at genai.owasp.org) supersedes it and may renumber, so check IDs against it. Model output is attacker-influenceable through prompt injection even when the user is trusted.

- **Rendering (LLM05):** model output goes through `renderMarkdown` ([security](security.md)), never raw `v-html`. When streaming, render plain text until a block completes, or re-sanitize the **full accumulated buffer** on every chunk; a tag split across chunks defeats per-delta sanitizing. Links keep the scheme allow-list and forced `rel`; images are proxied through your backend or stripped (a model can emit a tracking or exfiltration URL); code blocks are inert text, and a "Run" action needs a click and a sandbox. Never build a route, path, selector or component name from model text; only backend-validated structured tool calls drive behaviour.
- **Input and context (LLM01, LLM07, LLM08):** pasted, uploaded, fetched and retrieved content is shown in a visibly separate block from the assistant's own words, so injected instructions are visible as data. No user-editable field is prepended to the system prompt on the client; the backend owns it. Nothing in the production bundle, console or debug panel exposes the system prompt, tool schema or raw provider payloads. Show citations that link to the real source for retrieved claims (LLM09).
- **Keys and transport (LLM02, LLM10):** never call a model provider from the browser with a key; stream through your backend so it can rate-limit, redact, audit and cut a stream. Quota state is server state.
- **Agency (LLM06):** show a pending tool call (name and parameters) before it runs; require itemized confirmation naming the exact action, amount and target for destructive or financial actions; never auto-chain writes without a checkpoint; hide tools the role can't use (in addition to server enforcement); keep a visible log of executed actions.
- **Limits (LLM10):** visible turn and token caps with a clear stop; send and regenerate disabled while streaming; paste and upload sizes capped before submit.
- **Privacy (LLM02):** explicit consent before a document, screenshot or clipboard content enters a prompt, stating retention; chat history and drafts cleared on logout.

