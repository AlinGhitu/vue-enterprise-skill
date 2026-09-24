// GENERATED from references/testing.md by scripts/extract-snippets.mjs: edit the skill, not this file
import { createApp, type App, type InjectionKey } from 'vue'

type Provision = readonly [key: InjectionKey<unknown> | string, value: unknown]

export function withSetup<T>(composable: () => T, provisions: readonly Provision[] = []): readonly [T, App] {
  let result!: T                                   // definite assignment: allowed in test code
  const app = createApp({ setup() { result = composable(); return () => null } })
  for (const [key, value] of provisions) app.provide(key, value)   // provide BEFORE mount
  app.mount(document.createElement('div'))
  return [result, app]                             // app.unmount() in the test triggers onUnmounted / onScopeDispose
}
