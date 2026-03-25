<template>
  <Head title="Sơ đồ tổ chức" />

  <PageHeader title="Sơ đồ tổ chức công ty" subtitle="Cấu trúc phòng ban và nhân sự của Annha JSC">
    <template #actions>
      <div class="flex items-center gap-3">
        <a-segmented v-model:value="viewMode" :options="viewOptions" size="large" />
        <a-button @click="toggleFullscreen" size="large" class="rounded-xl">
          <template #icon><ExpandOutlined /></template>
        </a-button>
      </div>
    </template>
  </PageHeader>

  <!-- Stats bar -->
  <div class="org-stats">
    <div class="org-stats__item">
      <ApartmentOutlined class="org-stats__icon" style="color: #1B4F72;" />
      <div>
        <div class="org-stats__value">{{ stats.totalDepartments }}</div>
        <div class="org-stats__label">Phòng ban</div>
      </div>
    </div>
    <div class="org-stats__item">
      <TeamOutlined class="org-stats__icon" style="color: #0f766e;" />
      <div>
        <div class="org-stats__value">{{ stats.totalEmployees }}</div>
        <div class="org-stats__label">Nhân viên</div>
      </div>
    </div>
    <div class="org-stats__item">
      <UserOutlined class="org-stats__icon" style="color: #7c3aed;" />
      <div>
        <div class="org-stats__value">{{ managersCount }}</div>
        <div class="org-stats__label">Trưởng phòng</div>
      </div>
    </div>
  </div>

  <!-- Tree View -->
  <div ref="chartContainer" class="org-chart" :class="{ 'org-chart--fullscreen': isFullscreen }">
    <!-- Close fullscreen button -->
    <a-button v-if="isFullscreen" class="org-chart__close" shape="circle" size="large" @click="toggleFullscreen">
      <template #icon><CloseOutlined /></template>
    </a-button>

    <!-- Zoom controls -->
    <div class="org-chart__controls">
      <a-button-group>
        <a-button @click="zoomIn"><PlusOutlined /></a-button>
        <a-button @click="resetZoom">{{ Math.round(scale * 100) }}%</a-button>
        <a-button @click="zoomOut"><MinusOutlined /></a-button>
      </a-button-group>
    </div>

    <div
      class="org-chart__canvas"
      :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }"
    >
      <!-- Company root -->
      <div class="org-tree">
        <div class="org-node org-node--company" @click="selectedDept = null">
          <div class="org-node__logo">
            <ApartmentOutlined style="font-size: 28px; color: white;" />
          </div>
          <div class="org-node__company-name">Annha JSC</div>
          <div class="org-node__company-info">{{ stats.totalDepartments }} phòng ban · {{ stats.totalEmployees }} nhân viên</div>
        </div>

        <!-- Connector -->
        <div class="org-connector org-connector--vertical" v-if="departments.length"></div>
        <div class="org-connector org-connector--horizontal" v-if="departments.length" :style="horizontalLineStyle"></div>

        <!-- Level 1 departments -->
        <div class="org-level">
          <div v-for="dept in departments" :key="dept.id" class="org-branch">
            <div class="org-connector org-connector--down"></div>
            <OrgNode
              :dept="dept"
              :color="getDeptColor(dept.id)"
              :selected="selectedDept?.id === dept.id"
              @click="selectDept(dept)"
            />
            <!-- Level 2 children -->
            <template v-if="dept.children && dept.children.length">
              <div class="org-connector org-connector--vertical org-connector--child"></div>
              <div class="org-connector org-connector--horizontal org-connector--child"
                   :style="getChildHLine(dept.children.length)">
              </div>
              <div class="org-sub-level">
                <div v-for="child in dept.children" :key="child.id" class="org-branch">
                  <div class="org-connector org-connector--down"></div>
                  <OrgNode
                    :dept="child"
                    :color="getDeptColor(dept.id)"
                    :selected="selectedDept?.id === child.id"
                    :small="true"
                    @click="selectDept(child)"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Detail drawer -->
  <a-drawer
    :open="!!selectedDept"
    :title="selectedDept?.name || ''"
    placement="right"
    :width="400"
    @close="selectedDept = null"
  >
    <template v-if="selectedDept">
      <div class="drawer-section">
        <div class="drawer-label">Mã phòng ban</div>
        <a-tag color="blue">{{ selectedDept.code || 'N/A' }}</a-tag>
      </div>
      <div class="drawer-section">
        <div class="drawer-label">Trưởng phòng</div>
        <div v-if="selectedDept.manager" class="flex items-center gap-3">
          <a-avatar :size="36" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);">
            {{ selectedDept.manager.name?.charAt(0)?.toUpperCase() }}
          </a-avatar>
          <div>
            <div class="font-semibold text-gray-800">{{ selectedDept.manager.name }}</div>
            <div class="text-xs text-gray-400">{{ selectedDept.manager.email }}</div>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm italic">Chưa gán trưởng phòng</div>
      </div>
      <div class="drawer-section">
        <div class="drawer-label">Mô tả</div>
        <div class="text-sm text-gray-600">{{ selectedDept.description || 'Chưa có mô tả' }}</div>
      </div>
      <a-divider />
      <div class="drawer-label mb-3">
        Nhân viên ({{ selectedDept.employees?.length || selectedDept.users_count || 0 }})
      </div>
      <div v-if="selectedDept.employees?.length" class="space-y-2">
        <div v-for="emp in selectedDept.employees" :key="emp.id"
             class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
          <a-avatar :size="32" style="background: #1B4F72;">
            {{ emp.name?.charAt(0)?.toUpperCase() }}
          </a-avatar>
          <div>
            <div class="text-sm font-medium text-gray-800">{{ emp.name }}</div>
            <div class="text-xs text-gray-400">{{ emp.email }}</div>
          </div>
        </div>
      </div>
      <a-empty v-else description="Chưa có nhân viên" :image="null" />
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import OrgNode from './OrgNode.vue'
import {
  ApartmentOutlined,
  TeamOutlined,
  UserOutlined,
  ExpandOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  departments: Array,
  stats: Object,
})

const viewMode = ref('tree')
const viewOptions = [
  { label: 'Sơ đồ cây', value: 'tree' },
]
const selectedDept = ref(null)
const isFullscreen = ref(false)
const scale = ref(1)
const chartContainer = ref(null)

const managersCount = computed(() => {
  let count = 0
  const countManagers = (depts) => {
    depts?.forEach(d => {
      if (d.manager) count++
      if (d.children) countManagers(d.children)
    })
  }
  countManagers(props.departments)
  return count
})

const deptColors = [
  'linear-gradient(135deg, #1B4F72, #2E86C1)',
  'linear-gradient(135deg, #0f766e, #14b8a6)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #ea580c, #fb923c)',
  'linear-gradient(135deg, #b91c1c, #ef4444)',
  'linear-gradient(135deg, #0369a1, #38bdf8)',
  'linear-gradient(135deg, #4338ca, #818cf8)',
  'linear-gradient(135deg, #9333ea, #c084fc)',
]

const getDeptColor = (id) => deptColors[(id - 1) % deptColors.length]

const selectDept = (dept) => {
  selectedDept.value = dept
}

const horizontalLineStyle = computed(() => {
  const n = props.departments.length
  if (n <= 1) return { width: '0' }
  return { width: `calc(${(n - 1) * 280}px)` }
})

const getChildHLine = (count) => {
  if (count <= 1) return { width: '0' }
  return { width: `calc(${(count - 1) * 240}px)` }
}

const zoomIn = () => { scale.value = Math.min(scale.value + 0.15, 2) }
const zoomOut = () => { scale.value = Math.max(scale.value - 0.15, 0.3) }
const resetZoom = () => { scale.value = 1 }

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}
</script>

<style scoped>
/* ─── Stats ─── */
.org-stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.org-stats__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  flex: 1;
}
.org-stats__icon { font-size: 24px; }
.org-stats__value { font-size: 24px; font-weight: 800; color: #1F2937; }
.org-stats__label { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

/* ─── Chart Container ─── */
.org-chart {
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  padding: 2rem;
  overflow: auto;
  min-height: 500px;
  position: relative;
  transition: all 0.3s ease;
}
.org-chart--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  border-radius: 0;
  padding: 2rem;
  background: #F5F7FA;
}
.org-chart__close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}
.org-chart__controls {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.org-chart__canvas {
  transition: transform 0.2s ease;
}

/* ─── Tree Structure ─── */
.org-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 2rem;
}

/* ─── Company Node ─── */
.org-node--company {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 40px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.org-node--company:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
}
.org-node__logo {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.org-node__company-name {
  font-size: 20px;
  font-weight: 800;
  color: white;
}
.org-node__company-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* ─── Connectors ─── */
.org-connector--vertical {
  width: 2px;
  height: 40px;
  background: linear-gradient(to bottom, #CBD5E1, #94A3B8);
  margin: 0 auto;
}
.org-connector--vertical.org-connector--child {
  height: 28px;
}
.org-connector--horizontal {
  height: 2px;
  background: #CBD5E1;
  margin: 0 auto;
}
.org-connector--horizontal.org-connector--child {
  margin: 0 auto;
}
.org-connector--down {
  width: 2px;
  height: 28px;
  background: linear-gradient(to bottom, #CBD5E1, #94A3B8);
  margin: 0 auto;
}

/* ─── Levels ─── */
.org-level {
  display: flex;
  justify-content: center;
  gap: 0;
}
.org-branch {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 280px;
}
.org-sub-level {
  display: flex;
  justify-content: center;
  gap: 0;
}
.org-sub-level .org-branch {
  min-width: 240px;
}

/* ─── Drawer ─── */
.drawer-section {
  margin-bottom: 20px;
}
.drawer-label {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
</style>
