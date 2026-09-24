// Writes every snippet listed in snippets.mjs from the skill's markdown into this project.
// `--check` writes nothing and exits 1 when a generated file differs from the markdown.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { snippets } from './snippets.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const references = join(root, '..', 'skills', 'vue-enterprise', 'references')
const check = process.argv.includes('--check')

function codeBlocks(markdown) {
  const blocks = []
  let current = null
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      if (current) { blocks.push(current.join('\n')); current = null }
      else current = []
    } else if (current) current.push(line)
  }
  return blocks
}

let failures = 0
for (const s of snippets) {
  const blocks = codeBlocks(readFileSync(join(references, s.md), 'utf8'))
  const found = blocks.filter((b) => b.split('\n').some((l) => l.includes(s.match)))
  if (found.length !== 1) {
    console.error(`✗ ${s.md}: "${s.match}" matches ${found.length} code blocks (expected 1)`)
    failures++
    continue
  }
  const header = s.out.endsWith('.vue')
    ? `<!-- GENERATED from references/${s.md} by scripts/extract-snippets.mjs: edit the skill, not this file -->\n`
    : `// GENERATED from references/${s.md} by scripts/extract-snippets.mjs: edit the skill, not this file\n`
  const content = header + (s.before ?? '') + found[0] + '\n' + (s.after ?? '')
  const target = join(root, s.out)
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) {
      console.error(`✗ ${s.out} is out of date with references/${s.md}: run pnpm snippets`)
      failures++
    }
  } else {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}
if (failures) process.exit(1)
console.log(check ? `✓ ${snippets.length} snippets match the skill` : `✓ wrote ${snippets.length} snippets`)
