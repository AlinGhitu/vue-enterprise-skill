// GENERATED from references/composables.md by scripts/extract-snippets.mjs: edit the skill, not this file
import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { toError } from '@/shared/lib/errors'
import { fetchInvoice, type Invoice } from '../api'

export interface UseInvoiceOptions { immediate?: boolean }
export interface UseInvoiceReturn {
  data: Readonly<ShallowRef<Invoice | null>>   // Readonly: callers read, only the composable writes
  error: Readonly<ShallowRef<Error | null>>
  isLoading: Readonly<ShallowRef<boolean>>
  reload: () => Promise<void>
}

export function useInvoice(
  id: MaybeRefOrGetter<string>,                 // required inputs first
  options: UseInvoiceOptions = {},              // options object last
): UseInvoiceReturn {                           // explicit return type on exported functions
  const { immediate = true } = options          // every option has a default
  const data = shallowRef<Invoice | null>(null)
  const error = shallowRef<Error | null>(null)
  const isLoading = shallowRef(false)
  let controller: AbortController | undefined

  async function load(currentId: string) {
    controller?.abort()                         // a newer load cancels the older one
    const current = (controller = new AbortController())
    isLoading.value = true
    error.value = null
    try { data.value = await fetchInvoice(currentId, { signal: current.signal }) }
    catch (e) { if (!current.signal.aborted) error.value = toError(e) }   // e is unknown: convert, never cast
    finally { if (!current.signal.aborted) isLoading.value = false }
  }

  watch(() => toValue(id), load, { immediate }) // toValue inside the getter → tracked
  onScopeDispose(() => controller?.abort())     // self-cleanup on unmount / scope stop
  return { data, error, isLoading, reload: () => load(toValue(id)) }  // plain object of refs + functions
}
