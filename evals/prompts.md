# Evaluation prompts

Run these by hand in each supported tool (Claude Code, and Copilot in VS Code agent mode) before each release. Record the tool, its version, the model, the skill version and pass/fail per check in the table at the bottom, then put the tested versions in the SKILL.md compatibility note.

## Setup

```sh
node evals/setup.mjs ../vue-enterprise-eval    # any empty directory outside this repo
```

It creates a `create-vue` app (TypeScript, Router, Pinia, Vitest, Playwright, ESLint, Prettier, plus Pinia Colada and VueUse), installs the skill in `.claude/skills/`, the always-on rules in `.github/instructions/`, and an `AGENTS.md` that imports them. It commits a baseline on `main` and adds a `legacy` branch (Options API + Vuex) for E2. Both branches pass type-check, lint and unit tests.

- Open the eval app itself as the workspace (VS Code folder, or start Claude Code in it), not this repo.
- One prompt per fresh chat session. Before the next prompt, reset: `git checkout main && git reset --hard && git clean -fd` (use `legacy` instead of `main` for E2).
- **Did the skill load?** Claude Code shows the skill being invoked in the session transcript. In Copilot, the chat response's references list shows `.claude/skills/vue-enterprise/SKILL.md` being read.
- After each E prompt, also run `pnpm type-check && pnpm lint && pnpm test:unit --run` and note failures.

## Does the skill load?

| # | Prompt | Should load the skill? |
|---|---|---|
| T1 | "Create a `UserAvatar` component that shows initials when there's no image, with a test." | Yes |
| T2 | "Add a Pinia store for the cart with add, remove and a total." | Yes |
| T3 | "Write a composable that tracks window width and tells me when we're on mobile." | Yes |
| T4 | "Add `/invoices/:id` that loads and shows the invoice and reloads when the id changes." | Yes |
| T5 | "Review this component: it renders `comment.body` with `v-html` and `comment.website` in `:href`." | Yes |
| N1 | "Write an Express endpoint in `server/src/orders.ts` that returns paginated orders from Postgres." | No. The always-on file may still attach in Copilot because of its `**/*.ts` glob. |

## Does it follow the conventions?

**E1. Pinia vs server data.** "Build a paginated, accessible invoices table backed by a Pinia store, with sorting and a page-size selector."
- [ ] Explains why the rows don't go in a Pinia store; uses Pinia Colada with page and sort in the query key and `placeholderData`.
- [ ] Syncs page, sort and filters to the URL (`useRouteQuery`).
- [ ] Generic table component typed by row; `<caption>`; `aria-sort` on the sorted column only; sort controls are buttons.
- [ ] Tests cover the loading, empty and error states.

**E2. Which rule wins.** On the `legacy` branch, where `InvoiceDetail.vue` uses the Options API and a Vuex store: "Add a 'Mark as paid' button."
- [ ] Doesn't add a Vuex action or Options API code.
- [ ] Converts the whole component, or adds the new code beside the legacy code, and says which. Asking first also passes.

**E3. Untrusted HTML.** "Show the customer's bio (HTML from our CMS) and their website link on the profile page."
- [ ] The bio goes through `sanitizeHtml` with `// eslint-disable-next-line vue/no-v-html -- sanitized by sanitizeHtml`.
- [ ] The website link is scheme-checked (`https:`/`mailto:`).
- [ ] No DOMPurify import outside `shared/lib/sanitize.ts`.

**E4. Dialog and form.** "Add an 'Edit billing address' dialog with validation, server-side error display and an unsaved-changes warning."
- [ ] Headless dialog primitive, or a teleported dialog with focus trap, Escape and focus return.
- [ ] Edits a local draft; validates with a schema; `aria-describedby` and `aria-invalid`; focus moves to the error summary or first invalid field on submit.
- [ ] Server errors appear on their fields; buttons have an explicit `type`; strings go through i18n.

**E5. Timers and logout.** "Warn users 2 minutes before their session expires and log them out at zero."
- [ ] Uses VueUse (`useIntervalFn` or `useCountdown`), not a hand-written `setInterval`.
- [ ] States that the server enforces the timeout.
- [ ] Logout resets stores and clears the query cache, and notifies other tabs (`BroadcastChannel`).
- [ ] Tests fake the timers inside the test and advance them with `advanceTimersByTimeAsync`; the global setup fakes only `Date`.

## Results

| Date | Tool and version | Skill version | T1–T5, N1 | E1 | E2 | E3 | E4 | E5 |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
