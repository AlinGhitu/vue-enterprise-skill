// Per-run stats from a stream-json log: duration, cost, turns, tokens, skills used, skill files read.
import { readFileSync } from 'node:fs'
for (const f of process.argv.slice(2)) {
  const lines = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const res = lines.find((l) => l.type === 'result') ?? {}
  const skills = new Set(); const refs = new Set(); let tools = 0
  for (const l of lines) if (l.type === 'assistant') for (const c of l.message?.content ?? []) if (c.type === 'tool_use') {
    tools++
    if (c.name === 'Skill') skills.add(c.input?.skill ?? c.input?.command)
    const p = c.input?.file_path ?? c.input?.path ?? ''
    if (typeof p === 'string' && p.includes('.claude/skills/')) refs.add(p.split('.claude/skills/')[1])
    if (c.name === 'Bash' && /\.claude\/skills/.test(c.input?.command ?? '')) refs.add('bash:' + c.input.command.slice(0, 80))
  }
  const u = res.usage ?? {}
  console.log(JSON.stringify({ log: f.split('/').pop(), ok: res.subtype, minutes: +((res.duration_ms ?? 0) / 60000).toFixed(1), cost: res.total_cost_usd, turns: res.num_turns, tools, outTokens: u.output_tokens, inTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), skills: [...skills], skillFiles: [...refs] }))
}
