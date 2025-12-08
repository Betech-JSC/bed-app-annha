<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      theme="dark"
      width="256"
    >
      <div class="logo" style="height: 64px; padding: 16px; text-align: center; color: white; font-size: 20px; font-weight: bold;">
        <Link href="/admin" style="color: white; text-decoration: none;">
          SkySend Admin
        </Link>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        :items="menuItems"
        @click="handleMenuClick"
      />
    </a-layout-sider>
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0 24px; display: flex; justify-content: space-between; align-items: center;">
        <a-button
          type="text"
          :icon="collapsed ? h(MenuUnfoldOutlined) : h(MenuFoldOutlined)"
          @click="() => (collapsed = !collapsed)"
          style="font-size: 16px; width: 64px; height: 64px;"
        />
        <a-dropdown>
          <a class="ant-dropdown-link" @click.prevent>
            <a-space>
              <a-avatar :size="32" style="background-color: #1890ff">
                {{ admin.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
              </a-avatar>
              <span>{{ admin.user?.name || 'Admin' }}</span>
              <DownOutlined />
            </a-space>
          </a>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleLogout">
                Đăng xuất
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-layout-header>
      <a-layout-content style="margin: 24px 16px; padding: 24px; background: #fff; min-height: 280px;">
        <a-alert
          v-if="$page.props.flash?.success"
          :message="$page.props.flash.success"
          type="success"
          show-icon
          closable
          style="margin-bottom: 16px;"
        />
        <a-alert
          v-if="$page.props.flash?.error"
          :message="$page.props.flash.error"
          type="error"
          show-icon
          closable
          style="margin-bottom: 16px;"
        />
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import { MenuFoldOutlined, MenuUnfoldOutlined, DownOutlined, DashboardOutlined, UserOutlined, SendOutlined, ShoppingOutlined, FileTextOutlined, StarOutlined, BarChartOutlined, BellOutlined, SettingOutlined, SafetyOutlined, FileOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  admin: Object,
})

const collapsed = ref(false)
const page = usePage()

const selectedKeys = computed(() => {
  const url = page.url
  if (url.startsWith('/admin/users')) return ['users']
  if (url.startsWith('/admin/flights')) return ['flights']
  if (url.startsWith('/admin/orders')) return ['orders']
  if (url.startsWith('/admin/requests')) return ['requests']
  if (url.startsWith('/admin/reviews')) return ['reviews']
  if (url.startsWith('/admin/reports')) return ['reports']
  if (url.startsWith('/admin/notifications')) return ['notifications']
  if (url.startsWith('/admin/settings')) return ['settings']
  if (url.startsWith('/admin/roles') || url.startsWith('/admin/permissions')) return ['roles']
  if (url.startsWith('/admin/files')) return ['files']
  if (url === '/admin' || url === '/admin/dashboard') return ['dashboard']
  return []
})

const menuItems = [
  {
    key: 'dashboard',
    icon: h(DashboardOutlined),
    label: 'Dashboard',
  },
  {
    key: 'users',
    icon: h(UserOutlined),
    label: 'Quản lý Người dùng',
  },
  {
    key: 'flights',
    icon: h(SendOutlined),
    label: 'Quản lý Chuyến bay',
  },
  {
    key: 'orders',
    icon: h(ShoppingOutlined),
    label: 'Quản lý Đơn hàng',
  },
  {
    key: 'requests',
    icon: h(FileTextOutlined),
    label: 'Quản lý Yêu cầu',
  },
  {
    key: 'reviews',
    icon: h(StarOutlined),
    label: 'Đánh giá & Khiếu nại',
  },
  {
    key: 'reports',
    icon: h(BarChartOutlined),
    label: 'Báo cáo & Thống kê',
  },
  {
    key: 'notifications',
    icon: h(BellOutlined),
    label: 'Quản lý Thông báo',
  },
  {
    key: 'settings',
    icon: h(SettingOutlined),
    label: 'Cấu hình Hệ thống',
  },
  {
    key: 'roles',
    icon: h(SafetyOutlined),
    label: 'Vai trò & Phân quyền',
  },
  {
    key: 'files',
    icon: h(FileOutlined),
    label: 'Quản lý File',
  },
]

const handleMenuClick = ({ key }) => {
  const routes = {
    dashboard: '/admin',
    users: '/admin/users',
    flights: '/admin/flights',
    orders: '/admin/orders',
    requests: '/admin/requests',
    reviews: '/admin/reviews',
    reports: '/admin/reports',
    notifications: '/admin/notifications',
    settings: '/admin/settings',
    roles: '/admin/roles',
    files: '/admin/files',
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
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

