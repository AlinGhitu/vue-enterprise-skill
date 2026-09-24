// GENERATED from references/server-data.md by scripts/extract-snippets.mjs: edit the skill, not this file
import { useMutation, useQueryCache } from '@pinia/colada'
import { api, type NewInvoice } from '@/shared/api'
import { INVOICE_KEYS } from '../queries'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- harness wrapper around a skill fragment
export function useCreateInvoice() {
const queryCache = useQueryCache()
const { mutate, asyncStatus } = useMutation({
  mutation: (input: NewInvoice) => api.invoices.create(input),
  onSettled: () => queryCache.invalidateQueries({ key: INVOICE_KEYS.root }),
})
  return { mutate, asyncStatus }
}
