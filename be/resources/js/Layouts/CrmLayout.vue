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

          <!-- Sound Controls -->
          <a-tooltip :title="soundEnabled ? 'Tắt âm thông báo' : 'Bật âm thông báo'">
            <a-button type="text" shape="circle" class="crm-header__btn" @click="toggleSound">
              <template #icon>
                <SoundOutlined v-if="soundEnabled" style="font-size: 18px;" />
                <AudioMutedOutlined v-else style="font-size: 18px;" />
              </template>
            </a-button>
          </a-tooltip>

          <!-- Browser Notification Settings -->
          <a-tooltip :title="getBrowserNotificationTooltip()">
            <a-button type="text" shape="circle" class="crm-header__btn" @click="toggleBrowserNotifications">
              <template #icon>
                <NotificationOutlined v-if="browserPermission === 'granted'" style="font-size: 18px; color: #52c41a;" />
                <DesktopOutlined v-else-if="browserPermission === 'denied'" style="font-size: 18px; color: #ff4d4f;" />
                <DesktopOutlined v-else style="font-size: 18px;" />
              </template>
            </a-button>
          </a-tooltip>

          <!-- Notifications -->
          <a-badge :count="unreadCountLocal" :overflow-count="99">
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
            <!-- Real-time Notifications Toasts -->
            <div
              v-for="toast in activeToasts"
              :key="toast.id"
              class="pointer-events-auto group relative overflow-hidden p-4 rounded-2xl shadow-2xl flex items-start gap-4 cursor-pointer transition-all duration-300 border hover:scale-[1.02]"
              :class="getToastBorderClass(toast.priority)"
              @click="handleToastClick(toast)"
            >
              <!-- Colored Left Accent Line -->
              <div class="absolute left-0 top-0 bottom-0 w-1.5" :class="getToastAccentBgClass(toast.priority)"></div>
              
              <!-- Icon based on type -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border" :class="getToastIconClass(toast.priority)">
                <BellOutlined v-if="toast.type === 'system'" style="font-size: 18px" />
                <LineChartOutlined v-else-if="toast.type === 'project_performance'" style="font-size: 18px" />
                <AuditOutlined v-else-if="toast.type === 'workflow'" style="font-size: 18px" />
                <UserSwitchOutlined v-else-if="toast.type === 'assignment'" style="font-size: 18px" />
                <MessageOutlined v-else-if="toast.type === 'mention'" style="font-size: 18px" />
                <BellOutlined v-else style="font-size: 18px" />
              </div>
              
              <div class="flex-1 pr-6">
                <div class="text-sm font-bold text-gray-900 mb-0.5">{{ toast.title }}</div>
                <div class="text-xs text-gray-500 leading-relaxed">{{ toast.body }}</div>
                <div class="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getToastAccentBgClass(toast.priority)"></span>
                  {{ getPriorityLabel(toast.priority) }}
                </div>
              </div>
              
              <!-- Close button -->
              <button
                @click.stop="removeToast(toast.id)"
                class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseOutlined style="font-size: 12px" />
              </button>
            </div>
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

    <!-- AI Chat Widget (Only for BDH & Admin) -->
    <AiChatWidget v-if="canShowAiChat" />
  </a-layout>
</template>

<script setup>
import { ref, computed, h, watch } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import AiChatWidget from '@/Components/Crm/AiChatWidget.vue'
import { message } from 'ant-design-vue'
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
  BankOutlined,
  FieldTimeOutlined,
  SoundOutlined,
  AudioMutedOutlined,
  DesktopOutlined,
  NotificationOutlined,
  LineChartOutlined,
  UserSwitchOutlined,
  MessageOutlined,
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

// ==================================================================
// REAL-TIME NOTIFICATIONS LOGIC
// ==================================================================
const unreadCountLocal = ref(props.unreadCount)
const activeToasts = ref([])
const soundEnabled = ref(localStorage.getItem('crm_noti_sound') !== 'false')
const browserPermission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'default')

// Sync with prop when it changes (e.g. on manual read all or reload)
watch(() => props.unreadCount, (newVal) => {
  unreadCountLocal.value = newVal
})

// Play chime sound using Web Audio API
const playChime = () => {
  if (!soundEnabled.value) return
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0.15, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    const now = audioCtx.currentTime
    // Dual-tone: E5 (659.25Hz) followed by A5 (880Hz)
    playTone(659.25, now, 0.3)
    playTone(880.00, now + 0.1, 0.45)
  } catch (e) {
    console.error('Failed to play chime notification sound:', e)
  }
}

// Toast notification management
const addToast = (notification) => {
  const id = notification.id || Math.random().toString(36).substr(2, 9)
  const toast = {
    id,
    title: notification.title || 'Thông báo mới',
    body: notification.body || notification.message || '',
    priority: notification.priority || 'medium',
    type: notification.type || 'system',
    action_url: notification.action_url
  }
  activeToasts.value.push(toast)
  setTimeout(() => {
    removeToast(id)
  }, 6000)
}

const removeToast = (id) => {
  const index = activeToasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    activeToasts.value.splice(index, 1)
  }
}

const handleToastClick = (toast) => {
  removeToast(toast.id)
  if (toast.action_url) {
    router.visit(toast.action_url)
  } else {
    router.visit('/notifications')
  }
}

// Styling classes for toast alerts
const getToastBorderClass = (priority) => {
  return {
    urgent: 'border-red-100 bg-white/95 shadow-red-500/10',
    high: 'border-amber-100 bg-white/95 shadow-amber-500/10',
    medium: 'border-blue-100 bg-white/95 shadow-blue-500/10',
    low: 'border-gray-100 bg-white/95 shadow-gray-500/5',
  }[priority] || 'border-blue-100 bg-white/95 shadow-blue-500/10'
}

const getToastAccentBgClass = (priority) => {
  return {
    urgent: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-blue-500',
    low: 'bg-gray-400',
  }[priority] || 'bg-blue-500'
}

const getToastIconClass = (priority) => {
  return {
    urgent: 'bg-red-50 border-red-100/50 text-red-500',
    high: 'bg-amber-50 border-amber-100/50 text-amber-500',
    medium: 'bg-blue-50 border-blue-100/50 text-blue-500',
    low: 'bg-gray-50 border-gray-100/50 text-gray-400',
  }[priority] || 'bg-blue-50 border-blue-100/50 text-blue-500'
}

const getPriorityLabel = (priority) => {
  return {
    urgent: 'Khẩn cấp',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }[priority] || 'Trung bình'
}

// Audio and browser settings
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  localStorage.setItem('crm_noti_sound', soundEnabled.value.toString())
  message.success(soundEnabled.value ? 'Đã bật âm thanh thông báo' : 'Đã tắt âm thanh thông báo')
}

const toggleBrowserNotifications = async () => {
  if (typeof Notification === 'undefined') {
    message.warning('Trình duyệt của bạn không hỗ trợ thông báo đẩy.')
    return
  }
  
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    browserPermission.value = permission
    if (permission === 'granted') {
      new Notification('Thông báo CRM', {
        body: 'Đã bật nhận thông báo trình duyệt thành công!',
        icon: '/favicon.ico'
      })
    }
  } else {
    const statusText = Notification.permission === 'granted' ? 'Đã cho phép' : 'Đã chặn'
    message.info(`Quyền thông báo trình duyệt: ${statusText}. Bạn có thể cấu hình lại trong cài đặt trang web của trình duyệt.`)
  }
}

const getBrowserNotificationTooltip = () => {
  if (typeof Notification === 'undefined') return 'Trình duyệt không hỗ trợ'
  if (browserPermission.value === 'granted') return 'Thông báo trình duyệt: Đã Bật'
  if (browserPermission.value === 'denied') return 'Thông báo trình duyệt: Đã Chặn'
  return 'Bật thông báo trình duyệt'
}

// Show native browser desktop notification
const showDesktopNotification = (notification) => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const notif = new Notification(notification.title || 'Thông báo mới', {
      body: notification.body || notification.message || '',
      icon: '/favicon.ico',
    })
    notif.onclick = () => {
      window.focus()
      if (notification.action_url) {
        router.visit(notification.action_url)
      } else {
        router.visit('/notifications')
      }
    }
  }
}

// Main handler for incoming notifications
const handleNewNotification = (notification) => {
  unreadCountLocal.value++
  playChime()
  addToast(notification)
  if (document.hidden) {
    showDesktopNotification(notification)
  }
}

// Subscribe to Laravel Reverb via Echo
watch(() => props.auth?.user?.id, (newId, oldId) => {
  if (oldId && window.Echo) {
    window.Echo.leave(`App.Models.User.${oldId}`)
  }
  if (newId && window.Echo) {
    window.Echo.private(`App.Models.User.${newId}`)
      .listen('.NotificationSent', (e) => {
        handleNewNotification(e.notification)
      })
  }
}, { immediate: true })

const selectedKeys = computed(() => {
  const url = page.url
  if (url === '/' || url === '/dashboard') return ['dashboard']
  if (url.startsWith('/approvals')) return ['approvals']
  if (url.startsWith('/acceptance-templates')) return ['acceptance-templates']
  if (url.startsWith('/projects')) return ['projects']
  if (url.startsWith('/subcontractors')) return ['subcontractors']
  if (url.startsWith('/suppliers')) return ['suppliers']
  if (url.startsWith('/hr/kpi')) return can('kpi.view') ? ['kpi'] : ['kpi-assigned']
  if (url.startsWith('/hr/org-chart')) return ['org-chart']
  if (url.startsWith('/hr/departments')) return ['departments']
  if (url.startsWith('/hr/attendance')) return ['attendance']
  if (url.includes('mode=salary')) return ['payrolls']
  if (url.includes('/salary')) return ['my-payroll']
  if (url.includes('type=customer')) return ['customers']
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

const canShowAiChat = computed(() => {
  return false; // Tạm ẩn theo yêu cầu
  // if (isSuperAdmin.value) return true
  // const userRoles = props.auth?.user?.roles || []
  // const allowedRoles = ['Ban Dieu Hanh', 'Ban Điều Hành', 'Admin', 'Quản trị viên']
  // return userRoles.some(role => allowedRoles.includes(role))
})

const menuItems = computed(() => {
  const allItems = [
    {
      key: 'dashboard',
      icon: () => h(DashboardOutlined),
      label: 'Tổng quan',
      perm: 'dashboard.view',
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
      show: canAny('cost.approve.management', 'cost.approve.accountant', 'acceptance.approve.level_1', 'acceptance.approve.level_2', 'acceptance.approve.level_3', 'log.approve', 'material.approve', 'equipment.approve', 'attendance.approve'),
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
        { key: 'equipment', label: 'Kho tài sản & Thiết bị', perm: 'company_asset.view' },
        { key: 'suppliers', label: 'Nhà cung cấp', icon: () => h(ShopOutlined), perm: 'suppliers.view' },
      ],
    },
    {
      key: 'operations-group',
      icon: () => h(BankOutlined),
      label: 'Vận hành',
      children: [
        { key: 'operations-dashboard', label: 'Tổng quan dòng tiền', perm: 'operations.dashboard.view' },
        { key: 'shareholders', label: 'Nguồn vốn / Cổ đông', perm: 'shareholder.view' },
        { key: 'company-costs', label: 'Chi phí công ty', perm: 'company_cost.view' },
      ],
    },
    {
      key: 'hr-group',
      icon: () => h(TeamOutlined),
      label: 'Nhân sự & Tổ chức',
      children: [
        { key: 'employees', label: 'Nhân viên', perm: 'hr.employee.view' },
        { key: 'customers', label: 'Khách hàng', perm: 'hr.employee.view' },
        { key: 'payrolls', label: 'Cấu hình lương', perm: 'hr.salary.manage' },
        { key: 'my-payroll', label: 'Phiếu lương của tôi', icon: () => h(FileTextOutlined), show: !can('hr.salary.manage') },
        { key: 'departments', label: 'Phòng ban', perm: 'hr.employee.view' },
        { key: 'org-chart', label: 'Sơ đồ tổ chức', icon: () => h(ApartmentOutlined), perm: 'hr.employee.view' },
        { key: 'kpi', label: 'KPI nhân sự', icon: () => h(AimOutlined), perm: 'kpi.view' },
        { key: 'kpi-assigned', label: 'KPI được giao', icon: () => h(AimOutlined), show: !can('kpi.view') },
        { key: 'attendance', label: 'Chấm công', icon: () => h(FieldTimeOutlined), perm: 'attendance.view' },
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
        { key: 'cost-groups', label: 'Nhóm chi phí', icon: () => h(FolderOpenOutlined), perm: 'company_cost.view' },
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
      const filtered = item.children.filter(child => (child.show === undefined || child.show) && (!child.perm || can(child.perm)))
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
    finance: '/finance',
    'company-costs': '/finance/company-costs',
    'cost-groups': '/cost-groups',
    materials: '/materials',
    equipment: '/equipment',
    employees: '/hr/employees?type=employee',
    customers: '/hr/employees?type=customer',
    payrolls: '/hr/employees?mode=salary',
    departments: '/hr/departments',
    kpi: '/hr/kpi',
    'kpi-assigned': '/hr/kpi',
    'my-payroll': `/hr/employees/${props.auth?.user?.id}/salary`,
    'org-chart': '/hr/org-chart',
    'attendance': '/hr/attendance',
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
