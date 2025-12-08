<template>
  <div>
    <Head title="Edit Region" />
    <h1 class="mb-8 text-3xl font-bold">
      <Link class="text-indigo-400 hover:text-indigo-600" href="/regions">Regions</Link>
      <span class="text-indigo-400 font-medium">/</span> Edit
    </h1>
    <div class="max-w-3xl bg-white rounded-md shadow overflow-hidden">
      <form @submit.prevent="update">
        <div class="flex flex-wrap -mb-8 -mr-6 p-8">
          <text-input v-model="form.name" :error="form.errors.name" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Name" />
          <text-input v-model="form.code" :error="form.errors.code" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Code" />
          <select-input v-model="form.level" :error="form.errors.level" class="pb-8 pr-6 w-full lg:w-1/2" label="Level">
            <option :value="null" />
            <option value="1">First</option>
            <option value="2">Second</option>
            <option value="3">Third</option>
            <option value="4">Fourth</option>
          </select-input>
          <text-input v-model="form.parent_code" :error="form.errors.parent_code" class="pb-8 pr-6 w-full lg:w-1/2" label="Parent Code (optional)" />
          <text-input v-model="form.type" :error="form.errors.type" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Type (optional)" />
          <text-input v-model="form.name_with_type" :error="form.errors.name_with_type" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Name with Type" />
          <text-input v-model="form.path" :error="form.errors.path" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Path (optional)" />
          <text-input v-model="form.path_with_type" :error="form.errors.path_with_type" class="pb-8 pr-6 w-full lg:w-1/2" label="Region Path with Type (optional)" />
          <text-input v-model="form.sort" :error="form.errors.sort" class="pb-8 pr-6 w-full lg:w-1/2" label="Sort" type="number" />
        </div>
        <div class="flex items-center justify-end px-8 py-4 bg-gray-50 border-t border-gray-100">
          <loading-button :loading="form.processing" class="btn-indigo" type="submit">Update Region</loading-button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { Head, Link } from '@inertiajs/vue3'
import Layout from '@/Shared/Layout.vue'
import TextInput from '@/Shared/TextInput.vue'
import SelectInput from '@/Shared/SelectInput.vue'
import LoadingButton from '@/Shared/LoadingButton.vue'

export default {
  components: {
    Head,
    Link,
    LoadingButton,
    SelectInput,
    TextInput,
  },
  layout: Layout,
  props: {
    region: Object, // Passed region data from backend
  },
  remember: 'form',
  data() {
    return {
      form: this.$inertia.form({
        name: this.region.name,
        code: this.region.code,
        level: this.region.level,
        parent_code: this.region.parent_code,
        type: this.region.type,
        name_with_type: this.region.name_with_type,
        path: this.region.path,
        path_with_type: this.region.path_with_type,
        sort: this.region.sort,
        shipping_price: this.region.shipping_price,
      }),
    }
  },
  methods: {
    update() {
      this.form.put(`/regions/${this.region.id}`)
    },
  },
}
</script>
