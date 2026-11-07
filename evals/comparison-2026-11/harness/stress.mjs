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


const rowStatus = async (title) => { const row = page.locator('tr, li, article').filter({ hasText: title }).first(); return (await row.innerText()).replace(/\s+/g, ' ') }

await step('login', async () => { await page.goto(base + '/login'); await relogin(); return page.url().replace(base, '') })
await step('list reflects a close made on the detail page (SPA back)', async () => {
  await go('/tickets'); await wait(1500)
  const t = (await titles()).find(async () => true)
  // pick the first open ticket on page 1
  const lines = (await page.locator('body').innerText()).split('\n').filter((l) => /#\d+/.test(l) && /\bopen\b/i.test(l))
  const title = lines[0].match(/(.+?#\d+)/)[1].replace(/^[^A-Za-z]+/, '').trim()
  await page.getByRole('link', { name: title }).first().click(); await wait(1500)
  await page.getByRole('button', { name: /close ticket|^close$/i }).first().click(); await wait(1200)
  await page.goBack(); await wait(1500)
  const row = await rowStatus(title); if (!/closed/i.test(row)) throw new Error(`${title} still shows: ${row.slice(0, 80)}`)
  return title
})
await step('list reflects an edit (SPA navigation)', async () => {
  await go('/tickets/4/edit'); await wait(1500)
  await page.getByLabel(/title/i).fill('Renamed ticket number #4'); await page.getByRole('button', { name: /save|update|submit/i }).first().click(); await wait(1500)
  // navigate in-app to the list via a link, not a reload
  await page.getByRole('link', { name: /all tickets|tickets|back/i }).first().click(); await wait(1500)
  let found = false
  for (let i = 0; i < 6 && !found; i++) { found = (await page.locator('body').innerText()).includes('Renamed ticket number #4'); if (!found) { const n = page.getByRole('button', { name: /next/i }).or(page.getByRole('link', { name: /next/i })).first(); if (!(await n.isEnabled().catch(() => false))) break; await n.click(); await wait(1200) } }
  if (!found) throw new Error('old title still in list')
  return 'ok'
})
await step('race: slow older search does not win', async () => {
  await go('/tickets'); await wait(1500)
  await page.route('**/api/tickets?*', async (r) => { if (/q=Wrong/.test(r.request().url())) await new Promise((s) => setTimeout(s, 2500)); await r.continue().catch(() => {}) })
  const box = await searchBox(); await box.fill('Wrong'); await page.keyboard.press('Enter'); await wait(400)
  await box.fill('Invoice'); await page.keyboard.press('Enter'); await wait(3500)
  await page.unroute('**/api/tickets?*')
  const t = await titles(); if (!t.length || t.some((x) => !/Invoice/.test(x))) throw new Error('shows: ' + t.slice(0, 3).join('|'))
  if ((await box.inputValue()) !== 'Invoice') throw new Error('search box=' + await box.inputValue())
  return `${t.length} rows`
})
await step('expired session goes to login', async () => {
  await go('/tickets'); await wait(1500)
  await page.route('**/api/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Not authenticated"}' }))
  await page.getByRole('button', { name: /next/i }).or(page.getByRole('link', { name: /next/i })).first().click(); await wait(2500)
  await page.unroute('**/api/**')
  if (!new URL(page.url()).pathname.includes('login')) throw new Error('stayed on ' + page.url().replace(base, '') + ': ' + (await page.locator('main, body').first().innerText()).slice(0, 80).replace(/\s+/g, ' '))
  return page.url().replace(base, '')
})
await step('open redirect blocked', async () => {
  await page.goto(base + '/login?redirect=' + encodeURIComponent('//evil.example/steal')); await wait(800)
  const onLogin = new URL(page.url()).pathname.includes('login')
  if (onLogin) { await page.getByLabel(/email/i).fill('demo@example.com'); await page.getByLabel(/password/i).fill('demo1234'); await page.getByRole('button', { name: /log ?in|sign ?in/i }).click(); await wait(2000) }
  const u = new URL(page.url()); if (u.host !== new URL(base).host) throw new Error('went to ' + u.href)
  return u.pathname
})
await step('unknown ticket shows not found', async () => { await go('/tickets/9999'); await wait(1500); const b = await page.locator('body').innerText(); if (!/not found|doesn.t exist|does not exist|404/i.test(b)) throw new Error(b.slice(0, 100).replace(/\s+/g, ' ')); return 'ok' })
await step('double submit sends one comment', async () => {
  await go('/tickets/2'); await wait(1500); let posts = 0
  page.on('request', (r) => { if (r.method() === 'POST' && /comments$/.test(r.url())) posts++ })
  await page.locator('textarea').last().fill('Double click test'); const b = page.getByRole('button', { name: /comment|post|add|send/i }).last()
  await b.click(); await b.click({ timeout: 500 }).catch(() => {}); await wait(1500)
  if (posts !== 1) throw new Error(posts + ' POSTs'); return 'ok'
})
await browser.close()
console.log(JSON.stringify({ label, passed: results.filter((r) => r.ok).length, total: results.length, results, relogins }))
