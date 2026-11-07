Build a Support Desk app in this Vue project. The backend already exists: read API.md (start it with `pnpm api`; the Vite dev server proxies `/api` to it).

Features:
1. Login page (email and password). Every other page requires login: redirect to the login page, then back to the page the user wanted. A logout button.
2. Ticket list: text search, status filter, pagination (10 per page). Show title, status, priority, assignee name and created date.
3. Ticket detail: all fields, the comments with author names, and a form to add a comment.
4. Create and edit ticket forms, with client-side validation that matches the API rules, and the API's 422 errors shown next to the fields.
5. A "Close ticket" button on the detail page and in the list. It updates the UI immediately and rolls back if the request fails.

Handle loading, empty and error states. Write unit tests for the important logic. When you finish, `pnpm type-check`, `pnpm lint` and `pnpm test:unit --run` must pass.

Use any Vue skills available in this project. Work autonomously and don't ask questions.
