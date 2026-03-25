<template>
  <div class="crm-stat-card" :class="[`crm-stat-card--${variant}`]">
    <div class="crm-stat-card__icon">
      <component :is="resolvedIcon" style="font-size: 24px;" />
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
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  AimOutlined,
  AlertOutlined,
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FallOutlined,
  FileTextOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  PictureOutlined,
  ProjectOutlined,
  RiseOutlined,
  SafetyOutlined,
  SettingOutlined,
  StopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'

// Map string icon names → component references
const iconMap = {
  AimOutlined,
  AlertOutlined,
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FallOutlined,
  FileTextOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  PictureOutlined,
  ProjectOutlined,
  RiseOutlined,
  SafetyOutlined,
  SettingOutlined,
  StopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
}

const props = defineProps({
  value: { type: [Number, String], required: true },
  label: { type: String, required: true },
  icon: { type: [Object, Function, String], required: true },
  variant: { type: String, default: 'primary' }, // primary, success, warning, danger, accent
  trend: { type: Number, default: null },
  format: { type: String, default: 'number' }, // number, currency, percent, text
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

// Resolve icon: if string → look up in iconMap, otherwise use directly
const resolvedIcon = computed(() => {
  if (typeof props.icon === 'string') {
    return iconMap[props.icon] || props.icon
  }
  return props.icon
})

const formattedValue = computed(() => {
  let val = props.value
  if (props.format === 'text') {
    return `${props.prefix}${val}${props.suffix}`
  }
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
