import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { parseInvoiceId } from '@/features/invoices/route-params'
import InvoicePage from '@/pages/invoices/[id].vue'

const validId = '0b6c7c1e-8f4a-4f7e-9d7a-2b1f3c4d5e6f'

describe('parseInvoiceId', () => {
  it('accepts a well-formed id', () => {
    expect(parseInvoiceId(validId)).toBe(validId)
  })

  it.each([['not-an-id'], [''], [undefined], [[validId, validId]]])('rejects %j', (param) => {
    expect(parseInvoiceId(param)).toBeNull()
  })
})

// A page gets a real router with memory history (testing.md, Router).
async function renderAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/invoices/:id', component: InvoicePage }],
  })
  await router.push(path)
  await router.isReady()
  return mount(InvoicePage, { global: { plugins: [router] } })
}

describe('invoice page', () => {
  it('passes a parsed id to the controller', async () => {
    const wrapper = await renderAt(`/invoices/${validId}`)
    expect(wrapper.find('article').attributes('data-invoice-id')).toBe(validId)
  })

  it('renders NotFound for an invalid id', async () => {
    const wrapper = await renderAt('/invoices/not-an-id')
    expect(wrapper.text()).toBe('Not found')
  })
})
