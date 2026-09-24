import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { toError } from '@/shared/lib/errors'
import { reported } from '@/shared/lib/monitoring'
import ErrorBoundary from '@/shared/ui/ErrorBoundary.vue'

describe('toError', () => {
  it('returns Error instances unchanged', () => {
    const error = new TypeError('bad type')
    expect(toError(error)).toBe(error)
  })

  it('uses a thrown string as the message', () => {
    expect(toError('boom').message).toBe('boom')
  })

  it('keeps any other thrown value as the cause', () => {
    const value = { code: 42 }
    const error = toError(value)
    expect(error.message).toBe('Non-Error value thrown')
    expect(error.cause).toBe(value)
  })
})

describe('ErrorBoundary', () => {
  it('renders the error slot and reports the error instead of propagating it', async () => {
    const Thrower = defineComponent({
      setup() {
        throw new Error('render failed')
      },
      render: () => null,
    })
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(Thrower),
        error: ({ error }: { error: Error }) => h('p', error.message),
      },
    })
    await nextTick() // the boundary re-renders with the error slot on the next tick
    expect(wrapper.text()).toBe('render failed')
    expect(reported.at(-1)?.message).toBe('render failed')
  })
})
