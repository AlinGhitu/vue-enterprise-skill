import { defineComponent, h, provide, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseButton from '@/shared/ui/BaseButton.vue'
import DataList from '@/shared/ui/DataList.vue'
import { ButtonGroupKey } from '@/shared/ui/context'
import InvoiceForm from '@/features/invoices/components/InvoiceForm.vue'

function mountInGroup(groupDisabled: boolean, props: { disabled?: boolean } = {}) {
  return mount(defineComponent({
    setup() {
      provide(ButtonGroupKey, { disabled: ref(groupDisabled), size: ref<'sm' | 'md'>('sm') })
      return () => h(BaseButton, props)
    },
  }))
}

describe('context-supplied defaults (components.md)', () => {
  it('takes disabled from the group when the prop is absent', () => {
    expect(mountInGroup(true).find('button').element.disabled).toBe(true)
  })

  it('lets an explicit prop win over the group', () => {
    expect(mountInGroup(true, { disabled: false }).find('button').element.disabled).toBe(false)
  })

  it('takes size from the group and is enabled by default outside one', () => {
    expect(mountInGroup(false).find('button').attributes('data-size')).toBe('sm')
    const standalone = mount(BaseButton)
    expect(standalone.find('button').element.disabled).toBe(false)
    expect(standalone.find('button').attributes('data-size')).toBe('md')
  })
})

describe('form draft (forms.md)', () => {
  it('edits a local copy and emits the model only on submit', async () => {
    const invoice = { id: '1', number: 'INV-1', total: 10 }
    const wrapper = mount(InvoiceForm, { props: { modelValue: invoice } })

    await wrapper.find('input').setValue('INV-2')
    expect(invoice.number).toBe('INV-1')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('update:modelValue')).toEqual([[{ id: '1', number: 'INV-2', total: 10 }]])
  })
})

describe('generic component (typescript.md)', () => {
  it('passes the typed item to the slot and the event', async () => {
    const items = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]
    const wrapper = mount(DataList<{ id: string; label: string }>, {
      props: { items },
      slots: { row: ({ item }: { item: { id: string; label: string } }) => item.label },
    })
    expect(wrapper.text()).toBe('AlphaBeta')
    await wrapper.findAll('button')[1]?.trigger('click')
    expect(wrapper.emitted('pick')).toEqual([[items[1]]])
  })
})
