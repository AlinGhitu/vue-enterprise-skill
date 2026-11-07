You are a senior Vue 3 + TypeScript reviewer. This folder holds six apps (app-K, app-P, app-R, app-T, app-W, app-Z), each built by an AI coding agent from the same prompts (PROMPT-round1.md, then the change request PROMPT-round2.md) against the same API (API.md). Each app folder has its `src/`, `package.json`, and `round2.diff` (what the change request changed). The apps already pass type-check, lint and their own unit tests, so don't score those.

Review every app with the same rubric. For each criterion give a score from 1 to 5 and one line of concrete evidence (file and what you saw):

1. Correctness: real bugs or requirement gaps you can see in the code (list each one).
2. Structure: folder layout, how features are separated, how easy it would be to add a second feature.
3. Components: split between pages and presentational components, props/emits typing, size of the biggest components.
4. Server data: how fetching, caching, invalidation after mutations, and the optimistic close with rollback are done; race conditions (stale responses when filters change fast).
5. State: where auth and other state live, duplication of server data in client state.
6. Reactivity: computed vs watch usage, cleanup of listeners/timers/requests, props passed to composables correctly.
7. Types: modelling of API types, unsafe casts, non-null assertions.
8. Errors and UX states: loading, empty, error, 401 handling (expired token), 404.
9. Security: token storage, open redirects after login, v-html, anything else.
10. Accessibility: labels, error messages tied to inputs (aria-describedby / aria-invalid), live regions, focus, semantic table/list.
11. Tests: what they cover and whether they test behaviour or implementation details.
12. Change request: quality of round2.diff (did the URL become the source of truth, did it fit the existing design, back/forward, validation of query params, tests updated).

Then give each app a total out of 60 and rank them. Finish with the three most important differences between the best and the worst app, each with a short code excerpt.

Be strict and specific, and judge only the code you read. Read all files of every app before scoring. Write your full review as Markdown in your final answer.
