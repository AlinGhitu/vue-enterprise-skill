// Black-box smoke test of one Support Desk app. Usage: node smoke.mjs <baseURL> <label> <shotDir>
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH.split(':')[0] + '/')('playwright')
import { readFileSync, mkdirSync } from 'node:fs'
const [base, label, shots] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
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


await step('login', async () => { await page.goto(base + '/login'); await relogin(); return 'ok' })
await step('Edit -> New keeps no stale values', async () => {
  await go('/tickets/5/edit'); await wait(1500)
  const v = await page.getByLabel(/title/i).inputValue(); if (!/#5/.test(v)) throw new Error('edit not loaded: ' + v)
  await page.getByRole('link', { name: /new ticket/i }).first().click(); await wait(1500)
  const n = await page.getByLabel(/title/i).inputValue(); if (n) throw new Error('New form shows: ' + n); return 'empty'
})
await step('close in list under "open" filter removes or updates row', async () => {
  await go('/tickets?status=open'); await wait(1500)
  const sel = await selectFor(/status/i); if (!/open/i.test(await sel.inputValue())) { await pickOption(sel, /^open$/i); await wait(1500) }
  const before = await titles(); await page.getByRole('button', { name: /close/i }).first().click(); await wait(2500)
  const body = (await page.locator('body').innerText()).split('\n').filter((l) => l.includes(before[0])).join(' ')
  if (body && !/closed/i.test(body)) throw new Error('row still open'); return body ? 'row shows Closed, stays in Open list' : 'row removed from Open list'
})
await step('double click on Close sends one PATCH', async () => {
  await go('/tickets/7'); await wait(1500); let n = 0
  page.on('request', (r) => { if (r.method() === 'PATCH') n++ })
  await page.route('**/api/tickets/7', async (r) => { if (r.request().method() === 'PATCH') await new Promise((s) => setTimeout(s, 800)); await r.continue() })
  const b = page.getByRole('button', { name: /close ticket|^close$/i }).first(); await b.click(); await b.click({ timeout: 300, force: true }).catch(() => {}); await wait(1500)
  await page.unroute('**/api/tickets/7'); if (n !== 1) throw new Error(n + ' PATCH requests'); return 'ok'
})
await step('logged-in user visiting /login', async () => { await page.getByRole('link', { name: /tickets/i }).first().click().catch(() => {}); await wait(800); await page.evaluate(() => { history.pushState({}, '', '/login'); dispatchEvent(new PopStateEvent('popstate')) }); await wait(1200); return new URL(page.url()).pathname })
await step('reload keeps session', async () => { await go('/tickets'); await wait(1200); await page.reload(); await wait(1500); if (new URL(page.url()).pathname.includes('login')) throw new Error('logged out on reload'); return 'ok' })
await browser.close()
console.log(JSON.stringify({ label, passed: results.filter((r) => r.ok).length, total: results.length, results }))
