<template>
  <div class="crm-stat-card" :class="[`crm-stat-card--${variant}`]">
    <div class="crm-stat-card__icon">
      <component :is="icon" style="font-size: 24px;" />
    </div>
    <div class="flex-1 min-w-0">
      <span class="crm-stat-card__value">{{ formattedValue }}</span>
      <span class="crm-stat-card__label">{{ label }}</span>
    </div>
    <div v-if="trend !== null && trend !== undefined" class="crm-stat-card__trend" :class="trend >= 0 ? 'positive' : 'negative'">
      <ArrowUpOutlined v-if="trend >= 0" style="font-size: 10px;" />
      <ArrowDownOutlined v-else style="font-size: 10px;" />
      {{ Math.abs(trend) }}%
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  value: { type: [Number, String], required: true },
  label: { type: String, required: true },
  icon: { type: [Object, Function], required: true },
  variant: { type: String, default: 'primary' }, // primary, success, warning, danger, accent
  trend: { type: Number, default: null },
  format: { type: String, default: 'number' }, // number, currency, percent
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

const formattedValue = computed(() => {
  let val = props.value
  if (props.format === 'currency') {
    val = new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(val)
    return `${props.prefix}${val}đ`
  }
  if (props.format === 'percent') {
    return `${val}%`
  }
  if (typeof val === 'number') {
    val = new Intl.NumberFormat('vi-VN').format(val)
  }
  return `${props.prefix}${val}${props.suffix}`
})
</script>
