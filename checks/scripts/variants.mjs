// Writes the layout-specific copies of the always-on rules: assets/vue.instructions.md with a
// narrower `applyTo`, for repositories that also hold backend or tooling TypeScript.
// `--check` writes nothing and exits 1 when a copy differs from the default file.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'vue-enterprise', 'assets')
const check = process.argv.includes('--check')

export const variants = {
  vite: 'src/**/*.vue,src/**/*.ts,e2e/**/*.ts',
  nuxt: 'app/**/*.vue,app/**/*.ts,server/**/*.ts,shared/**/*.ts',
  monorepo: 'apps/web/**/*.vue,apps/web/**/*.ts,packages/ui/**/*.vue,packages/ui/**/*.ts',
}

const source = readFileSync(join(assets, 'vue.instructions.md'), 'utf8')
const applyTo = /^(---\napplyTo: )"[^"]*"\n/
if (!applyTo.test(source)) {
  console.error('✗ assets/vue.instructions.md has no applyTo on line 2')
  process.exit(1)
}

let failures = 0
for (const [name, globs] of Object.entries(variants)) {
  const content = source.replace(applyTo, `$1"${globs}"\n`)
  const target = join(assets, 'variants', name, 'vue.instructions.md')
  const rel = `assets/variants/${name}/vue.instructions.md`
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) {
      console.error(`✗ ${rel} is out of date with assets/vue.instructions.md: run pnpm variants`)
      failures++
    }
  } else {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}

if (failures) process.exit(1)
console.log(check ? `✓ ${Object.keys(variants).length} instruction variants match` : `wrote ${Object.keys(variants).length} instruction variants`)
