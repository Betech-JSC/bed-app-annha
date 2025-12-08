<template>
  <div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/admin">
        <div :class="isUrl('admin') && !isUrl('admin/users') && !isUrl('admin/flights') && !isUrl('admin/orders') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Dashboard</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/admin/users">
        <div :class="isUrl('admin/users') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Quản lý Người dùng</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/admin/flights">
        <div :class="isUrl('admin/flights') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Quản lý Chuyến bay</div>
      </Link>
    </div>
    <div class="mb-4">
      <Link class="group flex items-center py-3" href="/admin/orders">
        <div :class="isUrl('admin/orders') ? 'text-white' : 'text-indigo-300 group-hover:text-white'">Quản lý Đơn hàng</div>
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

