// The global test setup references/testing.md prescribes.
import { inspect } from 'node:util'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, vi } from 'vitest'

enableAutoUnmount(afterEach)

beforeEach(() => {
  // Fix the clock without faking timers: flushPromises and MSW need real setTimeout/setImmediate.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))

  // Fail on unexpected console output, Vue warnings included.
  for (const method of ['error', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : inspect(a, { depth: 1 }))).join(' ')
      throw new Error(`Unexpected console.${method}: ${text}`)
    })
  }
})

afterEach(() => {
  vi.useRealTimers()
})
