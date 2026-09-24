<!-- GENERATED from references/components.md by scripts/extract-snippets.mjs: edit the skill, not this file -->
<script setup lang="ts">
import { computed, inject } from 'vue'
import { ButtonGroupKey, useUiConfig } from '@/shared/ui/context'

// disabled defaults to undefined explicitly: a missing Boolean prop would otherwise be false and always win
const { disabled = undefined, size } = defineProps<{ disabled?: boolean; size?: 'sm' | 'md' }>()
const group = inject(ButtonGroupKey, undefined)   // optional context: no throw
const config = useUiConfig()                      // app-wide defaults (provided at bootstrap)
const isDisabled = computed(() => disabled ?? group?.disabled.value ?? false)
const resolvedSize = computed(() => size ?? group?.size.value ?? config.size ?? 'md')
</script>

<template>
  <button type="button" :disabled="isDisabled" :data-size="resolvedSize">Save</button>
</template>
