# Support Desk API

A fake REST API for this app. Start it with `pnpm api` (http://localhost:3001). The Vite dev server proxies `/api` to it. Data is in memory and resets on restart. Every response waits about 300 ms.

Demo login: `demo@example.com` / `demo1234`.

All endpoints except `POST /api/login` need `Authorization: Bearer <token>`; without a valid token they return `401 { message }`.

| Method | Path | Body / query | Response |
|---|---|---|---|
| POST | `/api/login` | `{ email, password }` | `200 { token, user }` or `401 { message }` |
| POST | `/api/logout` | | `204` |
| GET | `/api/me` | | `200 User` |
| GET | `/api/users` | | `200 User[]` |
| GET | `/api/tickets` | `?q=&status=&assigneeId=&page=1&pageSize=10` (`assigneeId=none` means unassigned) | `200 { items: Ticket[], total, page, pageSize }`, newest first |
| POST | `/api/tickets` | `{ title, description, priority, assigneeId? }` | `201 Ticket` or `422 { message, errors: { field: message } }` |
| GET | `/api/tickets/:id` | | `200 Ticket` or `404` |
| PATCH | `/api/tickets/:id` | any of `{ title, description, status, priority, assigneeId }` | `200 Ticket` or `422` / `404` |
| GET | `/api/tickets/:id/comments` | | `200 Comment[]` |
| POST | `/api/tickets/:id/comments` | `{ body }` | `201 Comment` or `422` |

Types:

```
User    { id: string, name: string, email: string }
Ticket  { id: string, title: string, description: string, status: 'open' | 'in_progress' | 'closed',
          priority: 'low' | 'medium' | 'high', assigneeId: string | null, createdAt: string, updatedAt: string }
Comment { id: string, ticketId: string, authorId: string, body: string, createdAt: string }
```

Validation: title 5-120 characters, description at least 10 characters.
