<template>
  <div class="approval-zone" :style="{ '--zone-color': color }">
    <!-- Zone Header -->
    <div class="zone-header">
      <div class="zone-header__left">
        <div class="zone-indicator" :style="{ background: color }"></div>
        <div>
          <h3 class="zone-title">{{ title }}</h3>
          <p class="zone-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div class="zone-header__right">
        <a-badge :count="items.length" :number-style="{ background: color }" />
        <a-button
          v-if="items.length > 0"
          type="text"
          size="small"
          @click="collapsed = !collapsed"
        >
          <template #icon>
            <UpOutlined v-if="!collapsed" />
            <DownOutlined v-else />
          </template>
        </a-button>
      </div>
    </div>

    <!-- Zone Content -->
    <div v-if="items.length === 0" class="zone-empty">
      <CheckCircleOutlined style="font-size: 40px; color: #D1D5DB;" />
      <p>{{ emptyText }}</p>
    </div>

    <div v-else-if="!collapsed" class="zone-items">
      <div
        v-for="item in items"
        :key="item.id"
        class="zone-card"
        @click="$emit('view', item)"
      >
        <!-- Card top row -->
        <div class="zone-card__header">
          <div class="zone-card__type">
            <a-tag
              :color="tagColors[item.type] || 'default'"
              class="rounded-lg text-xs"
            >
              {{ item.type_label }}
            </a-tag>
          </div>
          <div class="zone-card__amount" v-if="item.amount">
            {{ formatCurrency(item.amount) }}
          </div>
        </div>

        <!-- Card body -->
        <div class="zone-card__body">
          <div class="zone-card__title">{{ item.title }}</div>
          <div class="zone-card__subtitle">{{ item.subtitle }}</div>
        </div>

        <!-- Card meta & actions -->
        <div class="zone-card__footer">
          <div class="zone-card__meta">
            <a-avatar :size="24" style="background: #1B4F72; font-size: 10px;">
              {{ item.created_by?.charAt(0)?.toUpperCase() }}
            </a-avatar>
            <span class="text-xs text-gray-500">{{ item.created_by }} · {{ item.created_at }}</span>
          </div>
          <div class="zone-card__actions" @click.stop>
            <a-tooltip title="Xem chi tiết">
              <a-button type="text" size="small" @click.stop="$emit('view', item)">
                <template #icon><EyeOutlined style="color: #6B7280;" /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Duyệt">
              <a-button
                type="primary"
                size="small"
                class="rounded-lg"
                style="background: #10B981; border-color: #10B981;"
                @click.stop="$emit('approve', item)"
              >
                <template #icon><CheckOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Từ chối">
              <a-button
                danger
                size="small"
                class="rounded-lg"
                @click.stop="$emit('reject', item)"
              >
                <template #icon><CloseOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <!-- BĐH approval info (for accountant zone) -->
        <div v-if="level === 'accountant' && item.management_approved_by" class="zone-card__approval-info">
          <CheckCircleOutlined style="color: #10B981; font-size: 12px;" />
          <span class="text-xs text-gray-500">
            BĐH đã duyệt bởi <strong class="text-emerald-600">{{ item.management_approved_by }}</strong>
            <span v-if="item.management_approved_at"> · {{ item.management_approved_at }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'

defineProps({
  title: String,
  subtitle: String,
  items: { type: Array, default: () => [] },
  color: { type: String, default: '#1B4F72' },
  level: { type: String, default: 'management' },
  emptyText: { type: String, default: 'Không có yêu cầu' },
})

defineEmits(['approve', 'reject', 'view'])

const collapsed = ref(false)

const tagColors = {
  project_cost: 'blue',
  company_cost: 'gold',
  acceptance: 'purple',
  change_request: 'magenta',
  additional_cost: 'orange',
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)
}
</script>

<style scoped>
.approval-zone {
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  margin-bottom: 20px;
  transition: all 0.2s ease;
}

/* ─── Header ─── */
.zone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #F3F4F6;
}
.zone-header__left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.zone-header__right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.zone-indicator {
  width: 6px;
  height: 42px;
  border-radius: 6px;
  flex-shrink: 0;
}
.zone-title {
  font-size: 16px;
  font-weight: 800;
  color: #1F2937;
  margin: 0;
  line-height: 1.3;
}
.zone-subtitle {
  font-size: 12px;
  color: #9CA3AF;
  margin: 0;
}

/* ─── Empty ─── */
.zone-empty {
  text-align: center;
  padding: 40px 20px;
}
.zone-empty p {
  font-size: 13px;
  color: #9CA3AF;
  margin-top: 10px;
}

/* ─── Items Grid ─── */
.zone-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  padding: 20px 24px;
}

/* ─── Card ─── */
.zone-card {
  background: #FAFBFC;
  border: 1px solid #E8ECF1;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.zone-card:hover {
  background: white;
  border-color: var(--zone-color);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.zone-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.zone-card__amount {
  font-size: 16px;
  font-weight: 800;
  color: #059669;
}

.zone-card__body {
  margin-bottom: 12px;
}
.zone-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.zone-card__subtitle {
  font-size: 12px;
  color: #6B7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zone-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #F3F4F6;
}
.zone-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}
.zone-card__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.zone-card__approval-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: #F0FDF4;
  border-radius: 8px;
  border: 1px solid #BBF7D0;
}

@media (max-width: 768px) {
  .zone-items {
    grid-template-columns: 1fr;
  }
}
</style>
