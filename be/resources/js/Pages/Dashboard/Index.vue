<template>
  <div>
    <Head title="Dashboard" />
    <h1 class="mb-8 text-3xl font-bold">Dashboard</h1>
    <Chat />
  </div>
</template>

<script>
import { Head } from '@inertiajs/vue3'
import Layout from '@/Shared/Layout.vue'
import Chat from '../../Components/chat.vue'

export default {
  components: {
    Head,
    Chat,
  },
  layout: Layout,
}
</script>
