<template>
  <div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/">
        <div :class="isUrl('') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Dashboard</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/contacts">
        <div :class="isUrl('contacts') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Liên hệ</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/users">
        <div :class="isUrl('users') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Người dùng</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/regions">
        <div :class="isUrl('regions') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Tỉnh/Thành</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/orders">
        <div :class="isUrl('orders') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Đơn hàng</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/transactions">
        <div :class="isUrl('regions') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Lịch sử giao dịch</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/notifications">
        <div :class="isUrl('notifications') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Thông báo</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/settings">
        <div :class="isUrl('settings') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Cài đặt hệ thống</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/supports">
        <div :class="isUrl('supports') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Hỗ trợ</div>
      </Link>
    </div>
  </div>
</template>

<script>
import { Link } from '@inertiajs/vue3'
import Icon from '@/Shared/Icon.vue'

export default {
  components: {
    Icon,
    Link,
  },
  methods: {
    isUrl(...urls) {
      let currentUrl = this.$page.url.substr(1)
      if (urls[0] === '') {
        return currentUrl === ''
      }
      return urls.filter((url) => currentUrl.startsWith(url)).length
    },
  },
}
</script>
