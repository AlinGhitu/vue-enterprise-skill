<!-- GENERATED from references/forms.md by scripts/extract-snippets.mjs: edit the skill, not this file -->
<script setup lang="ts">
import { ref, toRaw, watch } from 'vue'
import type { Invoice } from '../api'

const model = defineModel<Invoice>({ required: true })
// eslint-disable-next-line vue/no-ref-object-reactivity-loss -- one-time snapshot; the watch below resyncs it
const form = ref(structuredClone(toRaw(model.value)))
watch(model, (v) => { form.value = structuredClone(toRaw(v)) }, { deep: true })   // parent changes, incl. in-place, reset the draft
function submit() { model.value = structuredClone(toRaw(form.value)) }
</script>

<template>
  <form @submit.prevent="submit">
    <label for="invoice-number">Number</label>
    <input id="invoice-number" v-model="form.number">
    <button type="submit">Save</button>
  </form>
</template>
