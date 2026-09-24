<!-- GENERATED from references/routing.md by scripts/extract-snippets.mjs: edit the skill, not this file -->
<!-- src/pages/invoices/[id].vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { parseInvoiceId } from '@/features/invoices/route-params'
import InvoiceDetail from '@/features/invoices/components/InvoiceDetail.vue'
import NotFound from '@/shared/ui/NotFound.vue'

const route = useRoute('/invoices/[id]')   // typed: params.id is a string
const invoiceId = computed(() => parseInvoiceId(route.params.id))
</script>

<template>
  <NotFound v-if="invoiceId === null" />
  <InvoiceDetail v-else :invoice-id="invoiceId" />
</template>
