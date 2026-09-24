<!-- Stub controller that the page example in references/routing.md renders. -->
<script setup lang="ts">
const { invoiceId } = defineProps<{ invoiceId: string }>()
</script>

<template>
  <article :data-invoice-id="invoiceId">
    Invoice {{ invoiceId }}
  </article>
</template>
