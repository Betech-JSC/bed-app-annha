<template>
  <Head title="Quản lý phòng ban" />

  <PageHeader title="Quản lý phòng ban" subtitle="Danh sách và quản lý các phòng ban">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm phòng ban
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-content-card">
    <a-table
      :columns="columns"
      :data-source="departments"
      :pagination="false"
      row-key="id"
      class="crm-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div>
            <div class="font-semibold">{{ record.name }}</div>
            <div class="text-xs text-gray-400" v-if="record.code">{{ record.code }}</div>
          </div>
        </template>

        <template v-else-if="column.key === 'manager'">
          {{ record.manager?.name || '—' }}
        </template>

        <template v-else-if="column.key === 'employees'">
          <a-tag color="blue" class="rounded-full">{{ record.users_count || 0 }} nhân viên</a-tag>
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-button type="text" size="small" @click="openEditModal(record)">
              <template #icon><EditOutlined /></template>
            </a-button>
            <a-popconfirm title="Xóa phòng ban này?" @confirm="deleteDepartment(record)">
              <a-button type="text" size="small" danger>
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Create/Edit Modal -->
  <a-modal
    v-model:open="showModal"
    :title="editingDept ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'"
    :width="560"
    @ok="handleSubmit"
    @cancel="resetForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16">
          <a-form-item label="Tên phòng ban" required>
            <a-input v-model:value="form.name" placeholder="Nhập tên..." size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mã">
            <a-input v-model:value="form.code" placeholder="HR, IT..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Trưởng phòng">
        <a-select v-model:value="form.manager_id" placeholder="Chọn trưởng phòng" show-search allow-clear size="large"
          :filter-option="(input, option) => option.children?.[0]?.children?.toString().toLowerCase().includes(input.toLowerCase())">
          <a-select-option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Mô tả">
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Mô tả phòng ban..." />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  departments: Array,
  users: Array,
})

const showModal = ref(false)
const editingDept = ref(null)

const columns = [
  { title: 'Phòng ban', key: 'name', width: 250 },
  { title: 'Trưởng phòng', key: 'manager', width: 180 },
  { title: 'Số nhân viên', key: 'employees', width: 140, align: 'center' },
  { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const form = useForm({
  name: '',
  code: '',
  description: '',
  manager_id: undefined,
})

const openCreateModal = () => {
  editingDept.value = null
  form.reset()
  showModal.value = true
}

const openEditModal = (dept) => {
  editingDept.value = dept
  form.name = dept.name
  form.code = dept.code || ''
  form.description = dept.description || ''
  form.manager_id = dept.manager_id || undefined
  showModal.value = true
}

const handleSubmit = () => {
  if (editingDept.value) {
    router.put(`/hr/departments/${editingDept.value.id}`, form.data(), {
      onSuccess: () => { showModal.value = false; resetForm() },
    })
  } else {
    router.post('/hr/departments', form.data(), {
      onSuccess: () => { showModal.value = false; resetForm() },
    })
  }
}

const resetForm = () => {
  editingDept.value = null
  form.reset()
}

const deleteDepartment = (dept) => {
  router.delete(`/hr/departments/${dept.id}`)
}
</script>

<style scoped>
.crm-content-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
}
.crm-table :deep(.ant-table-thead > tr > th) {
  background: #FAFBFC;
  font-weight: 600;
  font-size: 13px;
  color: #5D6B82;
}
.crm-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}
</style>
