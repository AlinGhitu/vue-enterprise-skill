<!-- GENERATED from references/typescript.md by scripts/extract-snippets.mjs: edit the skill, not this file -->
<script setup lang="ts" generic="T extends { id: string }">
const { items } = defineProps<{ items: readonly T[] }>()
const emit = defineEmits<{ pick: [item: T] }>()
defineSlots<{ row(props: { item: T; index: number }): unknown }>()
defineExpose({ scrollTo: (id: string) => items.findIndex((i) => i.id === id) })
</script>

<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <button type="button" @click="emit('pick', item)">
        <slot name="row" :item="item" :index="index" />
      </button>
    </li>
  </ul>
</template>
