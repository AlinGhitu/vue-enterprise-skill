// GENERATED from references/server-data.md by scripts/extract-snippets.mjs: edit the skill, not this file
import { defineQueryOptions } from '@pinia/colada'
import { api } from '@/shared/api'

export const INVOICE_KEYS = {
  root: ['invoices'] as const,
  byId: (id: string) => [...INVOICE_KEYS.root, id] as const,
}
export const invoiceByIdQuery = defineQueryOptions((id: string) => ({
  key: INVOICE_KEYS.byId(id),
  query: () => api.invoices.get(id),
}))
// controller, given an already-parsed id prop (see routing): const { state } = useQuery(() => invoiceByIdQuery(props.invoiceId))
