// GENERATED from references/state-and-data.md by scripts/extract-snippets.mjs: edit the skill, not this file
import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'

export const useInvoiceStore = defineStore('invoice', () => {
  const selectedId = ref<string | null>(null)
  function $reset(): void {
    selectedId.value = null
  }
  return { selectedId, $reset }
})
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useInvoiceStore, import.meta.hot))
