import { inject, onScopeDispose, type InjectionKey } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { withSetup } from './withSetup'

describe('withSetup (testing.md)', () => {
  it('provides values before mount and disposes the scope on unmount', () => {
    const Key: InjectionKey<string> = Symbol('key')
    const dispose = vi.fn<() => void>()
    const [value, app] = withSetup(() => {
      onScopeDispose(dispose)
      return inject(Key)
    }, [[Key, 'provided']])

    expect(value).toBe('provided')
    app.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

describe('fake timers (testing.md, Determinism)', () => {
  it('fixes the date from the setup file', () => {
    expect(new Date().toISOString()).toBe('2026-01-15T12:00:00.000Z')
  })

  it('freezes timers in the code under test until the test advances them', async () => {
    vi.useFakeTimers()
    const fired = vi.fn<() => void>()
    setTimeout(fired, 100)
    await flushPromises() // still settles: VTU captured the real scheduler when it was imported
    expect(fired).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(fired).toHaveBeenCalledTimes(1)
  })
})
