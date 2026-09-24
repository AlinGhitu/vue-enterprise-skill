// Builds the app that evals/prompts.md runs against, with the skill installed the way users install it.
// Usage: node evals/setup.mjs <empty target directory>
// Needs Node >= 24, pnpm and git. Then open the target directory in VS Code (Copilot) or Claude Code.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2] && resolve(process.argv[2])
if (!target) throw new Error('Usage: node evals/setup.mjs <empty target directory>')
if (existsSync(target) && readdirSync(target).length > 0) throw new Error(`${target} is not empty`)

const run = (command, cwd = target) => execSync(command, { cwd, stdio: 'inherit' })
const write = (path, text) => {
  mkdirSync(dirname(join(target, path)), { recursive: true })
  writeFileSync(join(target, path), text)
}

// 1. A Vue app with the stack the skill assumes.
mkdirSync(dirname(target), { recursive: true })
run(`npm create vue@latest -- --ts --router --pinia --vitest --playwright --eslint --prettier ${basename(target)}`, dirname(target))
run('pnpm install')
run('pnpm add @pinia/colada @vueuse/core')

// 2. The skill and the always-on rules, installed as the README tells users to.
cpSync(join(repo, 'skills', 'vue-enterprise'), join(target, '.claude', 'skills', 'vue-enterprise'), { recursive: true })
cpSync(join(repo, 'skills', 'vue-enterprise', 'assets', 'vue.instructions.md'), join(target, '.github', 'instructions', 'vue.instructions.md'))
write('AGENTS.md', '# AGENTS.md\n\n@.github/instructions/vue.instructions.md\n')

// 3. Baseline commit on main: reset between prompts with `git reset --hard && git clean -fd`.
run('git init -b main')
run('git config user.name "vue-enterprise eval" && git config user.email "eval@example.invalid"')
run('git add -A && git commit -q -m "Baseline: create-vue app with vue-enterprise installed"')

// 4. Branch `legacy` for prompt E2: an Options API component on a Vuex module.
run('git checkout -q -b legacy')
run('pnpm add vuex@4')
// Vuex 4's types don't resolve under moduleResolution "bundler"; this is the usual shim in legacy apps.
write('src/vuex-shim.d.ts', `declare module 'vuex' {
  export * from 'vuex/types/index.d.ts'
  export * from 'vuex/types/helpers.d.ts'
  export * from 'vuex/types/logger.d.ts'
  export * from 'vuex/types/vue.d.ts'
}
`)
write('src/store/index.ts', `import { createStore } from 'vuex'

export interface Invoice { id: string; number: string; status: 'open' | 'paid' }
export interface State { invoice: Invoice }

export default createStore<State>({
  state: () => ({ invoice: { id: '1', number: 'INV-1', status: 'open' } }),
  mutations: {
    setStatus(state, status: Invoice['status']) { state.invoice.status = status },
  },
})
`)
write('src/components/InvoiceDetail.vue', `<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

export default defineComponent({
  name: 'InvoiceDetail',
  computed: { ...mapState(['invoice']) },
})
</script>

<template>
  <article>
    <h2>{{ invoice.number }}</h2>
    <p>Status: {{ invoice.status }}</p>
  </article>
</template>
`)
const mainPath = join(target, 'src', 'main.ts')
const main = readFileSync(mainPath, 'utf8')
if (!main.includes('app.use(router)')) throw new Error('src/main.ts has no app.use(router) to anchor the Vuex install')
writeFileSync(mainPath, `import store from './store'\n${main.replace('app.use(router)', 'app.use(store)\napp.use(router)')}`)
run('git add -A && git commit -q -m "Legacy fixture for E2: Options API + Vuex"')
run('git checkout -q main')

console.log(`\nEval app ready: ${target}\nOpen it in VS Code (Copilot agent mode) or start Claude Code there, then follow evals/prompts.md.`)
