// Black-box smoke test of one Support Desk app. Usage: node smoke.mjs <baseURL> <label> <shotDir>
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH.split(':')[0] + '/')('playwright')
import { readFileSync, mkdirSync } from 'node:fs'
const [base, label, shots] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
const axeSrc = readFileSync('/tmp/bench/tools/node_modules/axe-core/axe.min.js', 'utf8')
const results = []
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
page.setDefaultTimeout(5000)
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 150)) })
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 150)))
const step = async (name, fn) => {
  try { const note = await fn(); results.push({ name, ok: true, note }) }
  catch (e) { results.push({ name, ok: false, note: String(e.message).split('\n')[0].slice(0, 160) }); await page.screenshot({ path: `${shots}/${label}-${name.replace(/\W+/g, '_')}.png` }).catch(() => {}) }
}
const wait = (ms) => page.waitForTimeout(ms)
const titles = async () => [...new Set((await page.locator('body').innerText()).match(/^.*#\d+.*$/gm)?.map((s) => s.match(/(.+?#\d+)/)[1].replace(/^[^A-Za-z]+/, '').replace(/^Close ticket\s*/, '').trim()) ?? [])]
const firstVisible = async (...locs) => { for (const l of locs) { if (await l.first().isVisible().catch(() => false)) return l.first() } throw new Error('control not found') }
const searchBox = () => firstVisible(page.getByRole('searchbox'), page.getByLabel(/search/i), page.getByPlaceholder(/search/i))
const selectFor = (re) => firstVisible(page.getByLabel(re), page.locator('select').filter({ has: page.locator('option', { hasText: re }) }))
const pickOption = async (sel, re) => { const opts = await sel.locator('option').allTextContents(); const o = opts.find((t) => re.test(t)); if (!o) throw new Error('option missing: ' + opts.join('|')); await sel.selectOption({ label: o }) }
const axe = async (name) => { await page.addScriptTag({ content: axeSrc }); const r = await page.evaluate(async () => (await window.axe.run()).violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length})`)); return `${name}: ${r.join(', ') || 'none'}` }
const axeNotes = []
let relogins = 0
const relogin = async () => {
  await wait(800)
  if (!new URL(page.url()).pathname.includes('login')) return false
  relogins++
  await page.getByLabel(/email/i).fill('demo@example.com'); await page.getByLabel(/password/i).fill('demo1234')
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 5000 }); await wait(1500); return true
}
const go = async (path) => { await page.goto(base + path); await relogin() }


await step('guard redirects to login', async () => { await page.goto(base + '/tickets/3'); await page.waitForURL((u) => u.pathname.includes('login'), { timeout: 5000 }); return page.url().replace(base, '') })
axeNotes.push(await axe('login').catch((e) => 'login: axe failed'))
await step('login redirects back', async () => {
  await page.getByLabel(/email/i).fill('demo@example.com'); await page.getByLabel(/password/i).fill('demo1234')
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).click()
  await page.waitForURL((u) => u.pathname === '/tickets/3', { timeout: 5000 }); return page.url().replace(base, '')
})
await step('list shows 10 rows with assignee names', async () => {
  await go('/tickets'); await wait(1500)
  const t = await titles(); const body = await page.locator('body').innerText()
  if (t.length !== 10) throw new Error(`rows=${t.length}`)
  if (!/Dana Pop|Mihai Ionescu|Ioana Stan|Radu Matei/.test(body)) throw new Error('no assignee names')
  return t.slice(0, 2).join(' | ')
})
axeNotes.push(await axe('list').catch(() => 'list: axe failed'))
await step('search', async () => { await (await searchBox()).fill('VAT'); await page.keyboard.press('Enter'); await wait(1500); const t = await titles(); if (!t.length || t.some((x) => !/VAT/.test(x))) throw new Error('titles: ' + t.join('|')); return `${t.length} rows` })
await step('status filter', async () => {
  await (await searchBox()).fill(''); await page.keyboard.press('Enter'); await wait(800)
  await pickOption(await selectFor(/status/i), /^closed$/i); await wait(1500)
  const body = await page.locator('main, body').first().innerText(); const t = await titles()
  if (t.length !== 10) throw new Error('rows=' + t.length)
  if (/\bopen\b|in progress|in_progress/i.test(body.split('\n').filter((l) => /#\d+/.test(l)).join('\n'))) throw new Error('non-closed rows')
  return 'ok'
})
await step('pagination', async () => { const before = await titles(); await page.getByRole('button', { name: /next/i }).or(page.getByRole('link', { name: /next/i })).first().click(); await wait(1500); const after = await titles(); if (!after.length || after[0] === before[0]) throw new Error('same page'); return `${before[0]} -> ${after[0]}` })
await step('detail shows fields and comments', async () => { await go('/tickets/2'); await wait(1500); const b = await page.locator('body').innerText(); if (!/Customer reports/.test(b)) throw new Error('no description'); if (!/Update 1/.test(b)) throw new Error('no comments'); if (!/Ioana Stan|Radu Matei|Dana Pop|Mihai Ionescu/.test(b)) throw new Error('no author names'); return 'ok' })
axeNotes.push(await axe('detail').catch(() => 'detail: axe failed'))
await step('add comment', async () => { await page.locator('textarea').last().fill('Smoke comment 42'); await page.getByRole('button', { name: /comment|post|add|send/i }).last().click(); await page.getByText('Smoke comment 42').first().waitFor({ timeout: 4000 }); return 'ok' })
await step('close ticket rolls back on failure', async () => {
  await go('/tickets/1'); await wait(1500)
  await page.route('**/api/tickets/1', (r) => r.request().method() === 'PATCH' ? setTimeout(() => r.fulfill({ status: 500, body: '{"message":"boom"}', contentType: 'application/json' }), 800) : r.continue())
  await page.getByRole('button', { name: /close ticket|^close$/i }).first().click(); await wait(300)
  const during = await page.locator('main, body').first().innerText()
  const optimistic = /closed/i.test(during) || !(await page.getByRole('button', { name: /close ticket|^close$/i }).first().isVisible().catch(() => false))
  await wait(1800)
  const rolled = await page.getByRole('button', { name: /close ticket|^close$/i }).first().isVisible().catch(() => false)
  await page.unroute('**/api/tickets/1')
  if (!optimistic) throw new Error('no immediate update'); if (!rolled) throw new Error('no rollback')
  return 'optimistic + rollback'
})
await step('close ticket succeeds', async () => { await page.getByRole('button', { name: /close ticket|^close$/i }).first().click(); await wait(1500); await page.reload(); await wait(1500); await relogin(); if (!/closed/i.test(await page.locator('body').innerText())) throw new Error('not closed after reload'); return 'ok' })
await step('close from list', async () => { await go('/tickets'); await wait(1500); const n = await page.getByRole('button', { name: /close/i }).count(); if (!n) throw new Error('no close buttons in list'); await page.getByRole('button', { name: /close/i }).first().click(); await wait(1500); return `${n} buttons` })
await step('create: client validation', async () => { await go('/tickets/new'); await wait(1200); await page.getByLabel(/title/i).fill('abc'); await page.getByLabel(/description/i).fill('short'); await page.getByRole('button', { name: /create|save|submit/i }).first().click(); await wait(800); const b = await page.locator('body').innerText(); if (!/5|at least|characters/i.test(b)) throw new Error('no validation message'); if (/^\/tickets\/\d+$/.test(new URL(page.url()).pathname)) throw new Error('submitted'); return 'ok' })
await step('create: shows server 422 next to field', async () => {
  await page.route('**/api/tickets', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Validation failed', errors: { title: 'Server says this title is taken' } }) }) : r.continue())
  await page.getByLabel(/title/i).fill('Printer on fire again'); await page.getByLabel(/description/i).fill('The office printer is on fire again.')
  const prio = await page.getByLabel(/priority/i).first(); if (await prio.isVisible().catch(() => false)) await pickOption(prio, /high/i).catch(() => {})
  await page.getByRole('button', { name: /create|save|submit/i }).first().click(); await wait(1200); await page.unroute('**/api/tickets')
  await page.getByText('Server says this title is taken').first().waitFor({ timeout: 2000 }); return 'ok'
})
await step('create: success', async () => { await page.getByRole('button', { name: /create|save|submit/i }).first().click(); await page.waitForURL((u) => /^\/tickets\/\d+$/.test(u.pathname), { timeout: 5000 }); await page.getByText('Printer on fire again').first().waitFor({ timeout: 3000 }); return page.url().replace(base, '') })
await step('edit form prefilled', async () => { await go('/tickets/4/edit'); await wait(1500); const v = await page.getByLabel(/title/i).inputValue(); if (!/#4/.test(v)) throw new Error('title=' + v); return v })
// Round 2
await step('R2 assignee filter + URL', async () => { await go('/tickets'); await wait(1500); await pickOption(await selectFor(/assignee|unassigned/i), /unassigned/i); await wait(1500); if (!/assignee/i.test(page.url())) throw new Error('url=' + page.url()); const b = await page.locator('body').innerText(); if (/Dana Pop|Mihai Ionescu|Ioana Stan|Radu Matei/.test(b.split('\n').filter((l) => /#\d+/.test(l)).join('\n'))) throw new Error('assigned rows shown'); return page.url().replace(base, '') })
await step('R2 search+status in URL survive reload', async () => {
  await go('/tickets'); await wait(1200)
  await (await searchBox()).fill('Invoice'); await page.keyboard.press('Enter'); await wait(1200); await pickOption(await selectFor(/status/i), /^open$/i); await wait(1500)
  const url = page.url(); if (!/Invoice/.test(url) || !/status=open/.test(url)) throw new Error('url=' + url)
  const before = await titles(); await page.reload(); await wait(1800); const re = await relogin(); const after = await titles()
  if ((await (await searchBox()).inputValue()) !== 'Invoice') throw new Error('search box reset'); if (before.join() !== after.join()) throw new Error('different rows after reload')
  return url.replace(base, '') + (re ? ' (reload asked to log in again)' : '')
})
await step('R2 page in URL + back/forward', async () => {
  await go('/tickets'); await wait(1500); const p1 = await titles()
  await page.getByRole('button', { name: /next/i }).or(page.getByRole('link', { name: /next/i })).first().click(); await wait(1500)
  if (!/page=2/.test(page.url())) throw new Error('url=' + page.url()); const p2 = await titles()
  await page.goBack(); await wait(1500); if ((await titles())[0] !== p1[0]) throw new Error('back did not restore page 1')
  await page.goForward(); await wait(1500); if ((await titles())[0] !== p2[0]) throw new Error('forward did not restore page 2')
  return 'ok'
})
await step('R2 deep link', async () => { await go('/tickets?status=closed&page=2'); await wait(1800); const re2 = relogins > 0; const t = await titles(); if (t.length !== 10) throw new Error('rows=' + t.length); const s = await selectFor(/status/i); if (!/closed/i.test(await s.inputValue())) throw new Error('select=' + await s.inputValue()); return re2 ? 'ok (after login)' : 'ok' })
await step('logout', async () => { await page.getByRole('button', { name: /log ?out|sign ?out/i }).or(page.getByRole('link', { name: /log ?out|sign ?out/i })).first().click(); await page.waitForURL(/login/, { timeout: 4000 }); await page.goto(base + '/tickets'); await page.waitForURL(/login/, { timeout: 4000 }); return 'ok' })
await browser.close()
console.log(JSON.stringify({ label, passed: results.filter((r) => r.ok).length, total: results.length, results, axe: axeNotes, relogins, consoleErrors: [...new Set(consoleErrors)].slice(0, 8) }))
