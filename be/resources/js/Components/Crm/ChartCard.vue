<template>
  <div class="crm-chart-card">
    <div class="crm-chart-card__header">
      <div>
        <h3 class="crm-chart-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="crm-chart-card__subtitle">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <a-segmented
          v-if="periods && periods.length"
          v-model:value="activePeriod"
          :options="periods"
          size="small"
          @change="$emit('period-change', $event)"
        />
        <slot name="actions" />
      </div>
    </div>
    <div class="crm-chart-card__body" :style="{ height: height + 'px' }">
      <a-spin v-if="loading" class="flex items-center justify-center h-full" />
      <slot v-else />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  height: { type: Number, default: 300 },
  loading: { type: Boolean, default: false },
  periods: { type: Array, default: null },
  defaultPeriod: { type: String, default: '' },
})

defineEmits(['period-change'])

const activePeriod = ref(props.defaultPeriod || props.periods?.[0] || '')
</script>
