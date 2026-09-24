<!-- GENERATED from references/errors.md by scripts/extract-snippets.mjs: edit the skill, not this file -->
<script setup lang="ts">
import { onErrorCaptured, shallowRef } from 'vue'
import { toError } from '@/shared/lib/errors'
import { report } from '@/shared/lib/monitoring'

defineSlots<{ default(): unknown; error(props: { error: Error; reset: () => void }): unknown }>()

const error = shallowRef<Error | null>(null)
onErrorCaptured((err) => {   // err is unknown
  error.value = toError(err)
  report(error.value)  // still send it to monitoring, as an Error
  return false         // stop propagation to app.config.errorHandler
})

function reset(): void {
  error.value = null
}
</script>

<template>
  <slot v-if="error" name="error" :error="error" :reset="reset" />
  <slot v-else />
</template>
