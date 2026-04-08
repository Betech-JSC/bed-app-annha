<template>
  <a-layout style="min-height: 100vh">
    <!-- Sidebar -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      :width="260"
      class="crm-sidebar"
      :collapsed-width="72"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 35 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.8678 35.0872C19.3542 35.0872 18.8496 33.8828 18.3613 32.2389L15.7734 23.6452C15.4642 22.5547 15.513 22.0013 16.1478 21.334L32.7656 3.41406C32.9609 3.20247 32.9447 2.95833 32.7819 2.79557C32.6191 2.64909 32.375 2.61654 32.1634 2.81185L14.3086 19.4948C13.6087 20.1458 13.0228 20.1784 11.9811 19.8529L3.19206 17.1836C1.62956 16.7116 0.490234 16.207 0.490234 14.7096C0.490234 13.5215 1.54818 12.6914 2.91536 12.1706L30.9102 1.44466C31.6589 1.15169 32.3262 0.988933 32.8796 0.988933C33.9375 0.988933 34.5885 1.63998 34.5885 2.69792C34.5885 3.2513 34.4258 3.91862 34.1328 4.66732L23.472 32.5156C22.8698 34.0781 22.0397 35.0872 20.8678 35.0872Z" fill="#007AFF"/>
          </svg>
        </div>
        <div v-if="!collapsed" class="overflow-hidden">
          <div class="text-white font-bold text-base leading-tight">Annha CRM</div>
          <div class="text-white/40 text-xs">Construction ERP</div>
        </div>
      </div>

      <!-- Menu -->
      <div class="py-4">
        <a-menu
          v-model:selectedKeys="selectedKeys"
          v-model:openKeys="openKeys"
          mode="inline"
          theme="dark"
          :inline-collapsed="collapsed"
          :items="menuItems"
          @click="handleMenuClick"
        />
      </div>
    </a-layout-sider>

    <!-- Main Content -->
    <a-layout>
      <!-- Header -->
      <a-layout-header class="crm-header" style="line-height: normal;">
        <div class="flex items-center gap-4">
          <a-button
            type="text"
            @click="collapsed = !collapsed"
            class="crm-header__btn"
          >
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>

          <!-- Breadcrumb -->
          <a-breadcrumb separator-style="color: rgba(255,255,255,0.3)">
            <a-breadcrumb-item>
              <Link href="/" class="crm-header__link">
                <HomeOutlined />
              </Link>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-for="item in breadcrumbs" :key="item.label">
              <Link v-if="item.href" :href="item.href" class="crm-header__link">
                {{ item.label }}
              </Link>
              <span v-else class="text-white font-medium">{{ item.label }}</span>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <div class="flex items-center gap-3">
          <!-- User Guide -->
          <a-tooltip title="Hướng dẫn sử dụng">
            <a-button type="text" shape="circle" class="crm-header__btn" @click="router.visit('/user-guide')">
              <template #icon><QuestionCircleOutlined style="font-size: 18px;" /></template>
            </a-button>
          </a-tooltip>

          <!-- Notifications -->
          <a-badge :count="unreadCount" :overflow-count="99">
            <a-button type="text" shape="circle" class="crm-header__btn" @click="router.visit('/notifications')">
              <template #icon><BellOutlined style="font-size: 18px;" /></template>
            </a-button>
          </a-badge>

          <!-- User -->
          <a-dropdown>
            <div class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <a-avatar :size="32" style="background: rgba(255,255,255,0.15); color: white; font-weight: 600;">
                {{ auth?.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
              </a-avatar>
              <div v-if="auth?.user" class="hidden md:block">
                <div class="text-sm font-semibold text-white leading-tight">{{ auth.user.name }}</div>
                <div class="text-xs text-white/50">{{ auth.user.email }}</div>
              </div>
              <DownOutlined class="text-white/50 text-xs" />
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <UserOutlined /> Hồ sơ
                </a-menu-item>
                <a-menu-item key="guide" @click="router.visit('/user-guide')">
                  <QuestionCircleOutlined /> Hướng dẫn CRM
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout" class="text-red-500">
                  <LogoutOutlined /> Đăng xuất
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- Content -->
      <a-layout-content style="background: var(--crm-bg);">
        <!-- Premium Floating Notifications -->
        <div class="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-[420px]">
          <TransitionGroup
            enter-active-class="transform transition duration-500 ease-out"
            enter-from-class="translate-x-full opacity-0 scale-95"
            enter-to-class="translate-x-0 opacity-100 scale-100"
            leave-active-class="transition duration-300 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
            <!-- Success Alert -->
            <div
              v-if="$page.props.flash?.success"
              key="success-alert"
              class="pointer-events-auto group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-emerald-100 p-4 rounded-2xl shadow-2xl shadow-emerald-500/10 flex items-start gap-4"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600 border border-emerald-100/50">
                <CheckCircleFilled style="font-size: 20px" />
              </div>
              <div class="flex-1 pr-6">
                <div class="text-sm font-bold text-gray-900 mb-0.5">Thành công</div>
                <div class="text-xs text-gray-500 leading-relaxed">{{ $page.props.flash.success }}</div>
              </div>
              <button
                @click="$page.props.flash.success = null"
                class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseOutlined style="font-size: 12px" />
              </button>
            </div>

            <!-- Error Alert -->
            <div
              v-if="$page.props.flash?.error"
              key="error-alert"
              class="pointer-events-auto group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-rose-100 p-4 rounded-2xl shadow-2xl shadow-rose-500/10 flex items-start gap-4"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
              <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-600 border border-rose-100/50">
                <CloseCircleFilled style="font-size: 20px" />
              </div>
              <div class="flex-1 pr-6">
                <div class="text-sm font-bold text-gray-900 mb-0.5">Thông báo lỗi</div>
                <div class="text-xs text-gray-500 leading-relaxed">{{ $page.props.flash.error }}</div>
              </div>
              <button
                @click="$page.props.flash.error = null"
                class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseOutlined style="font-size: 12px" />
              </button>
            </div>
          </TransitionGroup>
        </div>

        <div class="crm-page">
          <slot />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, computed, h, watch } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  HomeOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ProjectOutlined,
  TeamOutlined,
  DollarOutlined,
  ToolOutlined,
  SettingOutlined,
  SafetyOutlined,
  BarChartOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  CarOutlined,
  AuditOutlined,
  AimOutlined,
  UsergroupAddOutlined,
  ShopOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  ApartmentOutlined,
  FileProtectOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  BankOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  auth: Object,
  breadcrumbs: { type: Array, default: () => [] },
  unreadCount: { type: Number, default: 0 },
})

const collapsed = ref(false)
const page = usePage()

// Auto-dismiss flash messages after 2 seconds
watch(() => page.props.flash, (flash) => {
  if (flash?.success) {
    setTimeout(() => {
      page.props.flash.success = null
    }, 2000)
  }
  if (flash?.error) {
    setTimeout(() => {
      page.props.flash.error = null
    }, 2000)
  }
}, { deep: true, immediate: true })

const selectedKeys = computed(() => {
  const url = page.url
  if (url === '/' || url === '/dashboard') return ['dashboard']
  if (url.startsWith('/approvals')) return ['approvals']
  if (url.startsWith('/acceptance-templates')) return ['acceptance-templates']
  if (url.startsWith('/projects')) return ['projects']
  if (url.startsWith('/subcontractors')) return ['subcontractors']
  if (url.startsWith('/suppliers')) return ['suppliers']
  if (url.startsWith('/hr/kpi')) return ['kpi']
  if (url.startsWith('/hr/org-chart')) return ['org-chart']
  if (url.startsWith('/hr/departments')) return ['departments']
  if (url.startsWith('/hr')) return ['employees']
  if (url.startsWith('/finance/company-costs')) return ['company-costs']
  if (url.startsWith('/finance')) return ['finance']
  if (url.startsWith('/operations')) return ['operations-dashboard']
  if (url.startsWith('/cost-groups')) return ['cost-groups']
  if (url.startsWith('/materials')) return ['materials']
  if (url.startsWith('/equipment') || url.startsWith('/operations/assets')) return ['equipment']
  if (url.startsWith('/reports')) return ['reports']
  if (url.startsWith('/notifications')) return ['notifications']
  if (url.startsWith('/roles')) return ['roles']
  if (url.startsWith('/files')) return ['files']
  if (url.startsWith('/settings')) return ['settings']
  if (url.startsWith('/admin/permissions')) return ['roles']
  return []
})

const openKeys = ref(['projects-group', 'hr-group', 'resource-group', 'operations-group', 'system-group'])

// Permission helper
const userPerms = computed(() => props.auth?.user?.permissions || [])
const isSuperAdmin = computed(() => props.auth?.user?.super_admin === true)
const can = (perm) => isSuperAdmin.value || userPerms.value.includes(perm)
const canAny = (...perms) => isSuperAdmin.value || perms.some(p => userPerms.value.includes(p))

const menuItems = computed(() => {
  const allItems = [
    {
      key: 'dashboard',
      icon: () => h(DashboardOutlined),
      label: 'Tổng quan',
      // Always visible
    },
    {
      key: 'approvals',
      icon: () => h(AuditOutlined),
      label: (page.props.pending_approvals_count || 0) > 0
        ? h('span', { class: 'flex items-center justify-between w-full' }, [
            h('span', 'Trung tâm duyệt'),
            h('span', {
              class: 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)] ml-2',
            }, (page.props.pending_approvals_count > 99 ? '99+' : String(page.props.pending_approvals_count)))
          ])
        : 'Trung tâm duyệt',
      show: canAny('cost.approve.management', 'cost.approve.accountant', 'acceptance.approve.level_1', 'acceptance.approve.level_2', 'acceptance.approve.level_3', 'log.approve', 'material.approve', 'equipment.approve'),
    },
    {
      type: 'divider',
    },
    {
      key: 'projects-group',
      icon: () => h(ProjectOutlined),
      label: 'Dự án & Thi công',
      children: [
        { key: 'projects', label: 'Danh sách dự án', perm: 'project.view' },
        { key: 'subcontractors', label: 'Nhà thầu phụ', icon: () => h(UsergroupAddOutlined), perm: 'subcontractor.view' },
        { key: 'acceptance-templates', label: 'Bộ TL Nghiệm thu', icon: () => h(FileProtectOutlined), perm: 'acceptance.template.view' },
      ],
    },
    {
      key: 'resource-group',
      icon: () => h(ToolOutlined),
      label: 'Tài nguyên & Kho',
      children: [
        { key: 'materials', label: 'Vật tư xây dựng', perm: 'material.view' },
        { key: 'suppliers', label: 'Nhà cung cấp', icon: () => h(ShopOutlined), perm: 'material.view' },
      ],
    },
    {
      key: 'operations-group',
      icon: () => h(BankOutlined),
      label: 'Vận hành',
      children: [
        { key: 'operations-dashboard', label: 'Tổng quan dòng tiền' },
        { key: 'reports', label: 'Báo cáo dự án', perm: 'report.view' },
        { key: 'shareholders', label: 'Nguồn vốn / Cổ đông' },
        { key: 'equipment', label: 'Kho tài sản & Thiết bị', perm: 'equipment.view' },
        { key: 'company-costs', label: 'Chi phí công ty', perm: 'company_financial.view' },
        { key: 'cost-groups', label: 'Nhóm chi phí', perm: 'cost.view' },
      ],
    },
    {
      key: 'hr-group',
      icon: () => h(TeamOutlined),
      label: 'Nhân sự & Tổ chức',
      children: [
        { key: 'employees', label: 'Danh sách nhân viên', perm: 'personnel.view' },
        { key: 'departments', label: 'Phòng ban', perm: 'personnel.view' },
        { key: 'org-chart', label: 'Sơ đồ tổ chức', icon: () => h(ApartmentOutlined), perm: 'personnel.view' },
        { key: 'kpi', label: 'KPI nhân sự', icon: () => h(AimOutlined), perm: 'kpi.view' },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'system-group',
      icon: () => h(SettingOutlined),
      label: 'Hệ thống',
      children: [
        { key: 'files', label: 'Tổng hợp File', icon: () => h(FolderOpenOutlined), perm: 'document.view' },
        { key: 'notifications', label: 'Thông báo', icon: () => h(BellOutlined) }, // Always visible
        { key: 'roles', label: 'Phân quyền', icon: () => h(SafetyOutlined), perm: 'settings.manage' },
        { key: 'system-logs', label: 'Nhật ký hệ thống', icon: () => h(CodeOutlined), perm: 'settings.manage' },
        { key: 'settings', label: 'Cấu hình chung', icon: () => h(SettingOutlined), perm: 'settings.manage' },
        { key: 'user-guide', label: 'Hướng dẫn sử dụng', icon: () => h(BookOutlined) }, // Always visible
      ],
    },
  ]

  // Filter items by permission
  return allItems.map(item => {
    // Dividers always pass
    if (item.type === 'divider') return item

    // Top-level items with show property
    if (item.show !== undefined && !item.show) return null

    // Items with children → filter children
    if (item.children) {
      const filtered = item.children.filter(child => !child.perm || can(child.perm))
      if (filtered.length === 0) return null
      return { ...item, children: filtered }
    }

    // Leaf items with perm
    if (item.perm && !can(item.perm)) return null

    return item
  }).filter(Boolean)
})

const handleMenuClick = ({ key }) => {
  const routes = {
    dashboard: '/',
    approvals: '/approvals',
    projects: '/projects',
    reports: '/reports',
    finance: '/finance',
    'company-costs': '/finance/company-costs',
    'cost-groups': '/cost-groups',
    materials: '/materials',
    equipment: '/equipment',
    employees: '/hr/employees',
    departments: '/hr/departments',
    kpi: '/hr/kpi',
    'org-chart': '/hr/org-chart',
    subcontractors: '/subcontractors',
    suppliers: '/suppliers',
    'acceptance-templates': '/acceptance-templates',
    'operations-dashboard': '/operations',
    shareholders: '/operations/shareholders',
    'company-assets': '/operations/assets',
    notifications: '/notifications',
    settings: '/settings',
    roles: '/roles',
    files: '/files',
    'system-logs': '/system-logs',
    'user-guide': '/user-guide',
  }
  if (routes[key]) {
    router.visit(routes[key])
  }
}

const handleLogout = () => {
  router.post('/admin/logout')
}
</script>

<style scoped>
/* ─── Header ─── */
.crm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.crm-header__btn {
  color: rgba(255, 255, 255, 0.75) !important;
  transition: all 0.2s ease;
}
.crm-header__btn:hover {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.crm-header__link {
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s;
}
.crm-header__link:hover {
  color: white;
}

/* Breadcrumb separator fix for dark header */
.crm-header :deep(.ant-breadcrumb-separator) {
  color: rgba(255, 255, 255, 0.25);
}

/* ─── Sidebar ─── */
:deep(.ant-layout-sider) {
  position: fixed !important;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  overflow: auto;
}

:deep(.ant-layout-sider + .ant-layout) {
  margin-left: 260px;
  transition: margin-left 0.2s;
}

:deep(.ant-layout-sider-collapsed + .ant-layout) {
  margin-left: 72px;
}

:deep(.ant-layout-sider-collapsed) .overflow-hidden {
  display: none;
}
</style>
