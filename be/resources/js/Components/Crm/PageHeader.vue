<template>
  <div class="crm-page-header">
    <div>
      <h1 class="crm-page-title">{{ title }}</h1>
      <p v-if="subtitle" class="crm-page-subtitle">{{ subtitle }}</p>
    </div>
    <div class="crm-page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>
