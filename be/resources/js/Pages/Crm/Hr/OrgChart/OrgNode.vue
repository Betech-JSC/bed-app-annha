<template>
  <div
    class="org-dept-node"
    :class="{ 'org-dept-node--selected': selected, 'org-dept-node--small': small }"
    @click.stop="$emit('click', dept)"
  >
    <!-- Color bar -->
    <div class="org-dept-node__bar" :style="{ background: color }"></div>

    <div class="org-dept-node__body">
      <!-- Manager avatar -->
      <div class="org-dept-node__avatar" :style="{ background: color }">
        <template v-if="dept.manager">
          {{ dept.manager.name?.charAt(0)?.toUpperCase() }}
        </template>
        <template v-else>
          <ApartmentOutlined style="font-size: 16px;" />
        </template>
      </div>

      <div class="org-dept-node__info">
        <div class="org-dept-node__name">{{ dept.name }}</div>
        <div class="org-dept-node__manager" v-if="dept.manager">
          <UserOutlined class="mr-1" style="font-size: 10px;" />
          {{ dept.manager.name }}
        </div>
        <div class="org-dept-node__manager org-dept-node__manager--empty" v-else>
          Chưa gán trưởng phòng
        </div>
      </div>

      <!-- Employee count badge -->
      <div class="org-dept-node__badge">
        <TeamOutlined style="font-size: 10px;" />
        {{ dept.users_count || dept.employees?.length || 0 }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ApartmentOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons-vue'

defineProps({
  dept: { type: Object, required: true },
  color: { type: String, default: 'linear-gradient(135deg, #1B4F72, #2E86C1)' },
  selected: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>

<style scoped>
.org-dept-node {
  width: 230px;
  background: white;
  border-radius: 16px;
  border: 2px solid #E8ECF1;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.org-dept-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
  border-color: #CBD5E1;
}
.org-dept-node--selected {
  border-color: #1B4F72;
  box-shadow: 0 0 0 3px rgba(27, 79, 114, 0.12), 0 8px 24px rgba(27, 79, 114, 0.1);
}
.org-dept-node--small {
  width: 200px;
}
.org-dept-node--small .org-dept-node__name {
  font-size: 12px;
}

.org-dept-node__bar {
  height: 4px;
  width: 100%;
}

.org-dept-node__body {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.org-dept-node__avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}

.org-dept-node__info {
  flex: 1;
  min-width: 0;
}
.org-dept-node__name {
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.org-dept-node__manager {
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.org-dept-node__manager--empty {
  color: #D1D5DB;
  font-style: italic;
}

.org-dept-node__badge {
  position: absolute;
  top: 10px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #F3F4F6;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
}
</style>
