// Structural checks on the skill: frontmatter both Claude Code and Copilot accept, links that
// resolve, an index that covers every reference file, a short always-on file, no tool names.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skill = join(repo, 'skills', 'vue-enterprise')
const errors = []
const fail = (message) => errors.push(message)

// Frontmatter: only `name` and `description` (the fields every supported tool accepts).
const skillMd = readFileSync(join(skill, 'SKILL.md'), 'utf8')
const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMd)?.[1]
if (!frontmatter) fail('SKILL.md has no frontmatter')
else {
  const fields = Object.fromEntries(frontmatter.split(/\r?\n/).map((l) => {
    const i = l.indexOf(':')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  }))
  const keys = Object.keys(fields).sort().join(',')
  if (keys !== 'description,name') fail(`frontmatter keys must be exactly name, description; found ${keys}`)
  if (fields.name !== 'vue-enterprise') fail('name must equal the folder name, vue-enterprise')
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fields.name ?? '') || fields.name.length > 64) fail('name breaks the Agent Skills naming rules')
  const length = (fields.description ?? '').length
  if (length < 1 || length > 1024) fail(`description is ${length} characters; allowed 1-1024`)
}

// Relative links resolve.
const files = [
  join(skill, 'SKILL.md'),
  ...readdirSync(join(skill, 'references')).map((f) => join(skill, 'references', f)),
  join(repo, 'README.md'),
  join(repo, 'AGENTS.md'),
]
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const path = resolve(dirname(file), target.split('#')[0])
    if (!existsSync(path)) fail(`${file.slice(repo.length + 1)}: broken link ${target}`)
  }
}

// Every reference file is reachable from the SKILL.md index.
for (const ref of readdirSync(join(skill, 'references'))) {
  if (!skillMd.includes(`(references/${ref})`)) fail(`references/${ref} is not linked from SKILL.md`)
}

// The always-on instructions stay short and keep their applyTo.
const always = readFileSync(join(skill, 'assets', 'vue.instructions.md'), 'utf8')
const lines = always.trimEnd().split(/\r?\n/).length
if (lines > 30) fail(`assets/vue.instructions.md is ${lines} lines; keep it at 30 or fewer`)
if (!/^---\r?\napplyTo: "\*\*\/\*\.vue,\*\*\/\*\.ts"/.test(always)) fail('assets/vue.instructions.md lost its applyTo frontmatter')

// Instructions are written as intent, not as one tool's API.
const toolPhrase = /\b(Read|Edit|Write|Bash|Grep|Glob|Task|WebFetch|WebSearch) tool\b|\bAgent tool\b/
for (const file of files.slice(0, -2)) {
  const text = readFileSync(file, 'utf8')
  const hit = text.split(/\r?\n/).findIndex((l) => toolPhrase.test(l))
  if (hit !== -1 && !text.split(/\r?\n/)[hit].includes('Claude Code takes')) {
    fail(`${file.slice(repo.length + 1)}:${hit + 1} names an agent tool; describe the intent instead`)
  }
}

// The version footer names a last-checked date.
if (!/Last checked against the official docs: \d{4}-\d{2}-\d{2}/.test(skillMd)) fail('SKILL.md lost its "Last checked" date')

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}
console.log(`✓ skill structure OK (${files.length} files checked)`)
