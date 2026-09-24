// Stub feature API that references/composables.md imports.
import type { Invoice } from '@/shared/api'

export type { Invoice } from '@/shared/api'

export function fetchInvoice(id: string, options: { signal: AbortSignal }): Promise<Invoice> {
  options.signal.throwIfAborted()
  return Promise.resolve({ id, number: 'INV-1', total: 0 })
}
