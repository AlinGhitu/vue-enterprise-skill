// Fake Support Desk API. Run with `pnpm api` (port 3001). Data lives in memory and resets on restart.
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const users = [
  { id: 'u1', name: 'Dana Pop', email: 'demo@example.com', password: 'demo1234' },
  { id: 'u2', name: 'Mihai Ionescu', email: 'mihai@example.com', password: 'demo1234' },
  { id: 'u3', name: 'Ioana Stan', email: 'ioana@example.com', password: 'demo1234' },
  { id: 'u4', name: 'Radu Matei', email: 'radu@example.com', password: 'demo1234' },
]
const statuses = ['open', 'in_progress', 'closed']
const priorities = ['low', 'medium', 'high']
const subjects = ['Cannot log in', 'Invoice missing', 'Export fails', 'Slow dashboard', 'Wrong VAT rate', 'Password reset email', 'Broken link in footer', 'Duplicate charge', 'Report shows old data', 'Upload times out']
const tickets = Array.from({ length: 57 }, (_, i) => ({
  id: String(i + 1),
  title: `${subjects[i % subjects.length]} #${i + 1}`,
  description: `Customer reports: ${subjects[i % subjects.length].toLowerCase()}. Steps to reproduce are in the attached notes.`,
  status: statuses[i % 3],
  priority: priorities[(i * 7) % 3],
  assigneeId: i % 5 === 0 ? null : users[i % 4].id,
  createdAt: new Date(Date.UTC(2026, 9, 1 + (i % 28), 9 + (i % 8))).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 9, 1 + (i % 28), 12)).toISOString(),
}))
const comments = tickets.flatMap((t, i) => Array.from({ length: i % 3 }, (_, j) => ({
  id: randomUUID(), ticketId: t.id, authorId: users[(i + j) % 4].id, body: `Update ${j + 1}: looking into it.`, createdAt: t.updatedAt,
})))
const sessions = new Map()
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email })

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
const readBody = (req) => new Promise((resolve) => {
  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve(null) } })
})
const validateTicket = (b, partial) => {
  const errors = {}
  if (!partial || 'title' in b) { if (typeof b.title !== 'string' || b.title.trim().length < 5 || b.title.length > 120) errors.title = 'Title must be 5-120 characters' }
  if (!partial || 'description' in b) { if (typeof b.description !== 'string' || b.description.trim().length < 10) errors.description = 'Description must be at least 10 characters' }
  if ('status' in b && !statuses.includes(b.status)) errors.status = 'Unknown status'
  if (!partial || 'priority' in b) { if (!priorities.includes(b.priority)) errors.priority = 'Unknown priority' }
  if ('assigneeId' in b && b.assigneeId !== null && !users.some((u) => u.id === b.assigneeId)) errors.assigneeId = 'Unknown user'
  return errors
}

createServer(async (req, res) => {
  await new Promise((r) => setTimeout(r, 300)) // network latency
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname
  const m = (re) => path.match(re)

  if (req.method === 'POST' && path === '/api/login') {
    const b = await readBody(req)
    const user = users.find((u) => u.email === b?.email && u.password === b?.password)
    if (!user) return send(res, 401, { message: 'Invalid email or password' })
    const token = randomUUID()
    sessions.set(token, user.id)
    return send(res, 200, { token, user: publicUser(user) })
  }

  const token = req.headers.authorization?.replace(/^Bearer /, '')
  const userId = token && sessions.get(token)
  if (!userId) return send(res, 401, { message: 'Not authenticated' })

  if (req.method === 'POST' && path === '/api/logout') { sessions.delete(token); return send(res, 204) }
  if (req.method === 'GET' && path === '/api/me') return send(res, 200, publicUser(users.find((u) => u.id === userId)))
  if (req.method === 'GET' && path === '/api/users') return send(res, 200, users.map(publicUser))

  if (req.method === 'GET' && path === '/api/tickets') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const status = url.searchParams.get('status')
    const assigneeId = url.searchParams.get('assigneeId')
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 10) || 10))
    let list = tickets.filter((t) => (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      && (!status || t.status === status)
      && (!assigneeId || (assigneeId === 'none' ? t.assigneeId === null : t.assigneeId === assigneeId)))
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return send(res, 200, { items: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize })
  }
  if (req.method === 'POST' && path === '/api/tickets') {
    const b = await readBody(req)
    if (!b) return send(res, 400, { message: 'Invalid JSON' })
    const errors = validateTicket(b, false)
    if (Object.keys(errors).length) return send(res, 422, { message: 'Validation failed', errors })
    const now = new Date().toISOString()
    const t = { id: String(tickets.length + 1), title: b.title.trim(), description: b.description.trim(), status: 'open', priority: b.priority, assigneeId: b.assigneeId ?? null, createdAt: now, updatedAt: now }
    tickets.push(t)
    return send(res, 201, t)
  }
  let match
  if ((match = m(/^\/api\/tickets\/([^/]+)$/))) {
    const t = tickets.find((x) => x.id === match[1])
    if (!t) return send(res, 404, { message: 'Ticket not found' })
    if (req.method === 'GET') return send(res, 200, t)
    if (req.method === 'PATCH') {
      const b = await readBody(req)
      if (!b) return send(res, 400, { message: 'Invalid JSON' })
      const errors = validateTicket(b, true)
      if (Object.keys(errors).length) return send(res, 422, { message: 'Validation failed', errors })
      for (const k of ['title', 'description', 'status', 'priority', 'assigneeId']) if (k in b) t[k] = typeof b[k] === 'string' ? b[k].trim() : b[k]
      t.updatedAt = new Date().toISOString()
      return send(res, 200, t)
    }
  }
  if ((match = m(/^\/api\/tickets\/([^/]+)\/comments$/))) {
    const t = tickets.find((x) => x.id === match[1])
    if (!t) return send(res, 404, { message: 'Ticket not found' })
    if (req.method === 'GET') return send(res, 200, comments.filter((c) => c.ticketId === t.id))
    if (req.method === 'POST') {
      const b = await readBody(req)
      if (typeof b?.body !== 'string' || !b.body.trim()) return send(res, 422, { message: 'Validation failed', errors: { body: 'Comment cannot be empty' } })
      const c = { id: randomUUID(), ticketId: t.id, authorId: userId, body: b.body.trim(), createdAt: new Date().toISOString() }
      comments.push(c)
      return send(res, 201, c)
    }
  }
  send(res, 404, { message: 'Not found' })
}).listen(3001, () => console.log('Fake API on http://localhost:3001'))
