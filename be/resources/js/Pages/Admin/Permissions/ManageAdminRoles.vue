<template>
  <div>
    <Head title="Phân quyền cho Admin" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/permissions')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Phân quyền cho Admin</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px;">
      <a-table
        :columns="columns"
        :data-source="admins"
        :pagination="false"
        :row-key="record => record.id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'super_admin'">
            <a-tag :color="record.super_admin ? 'red' : 'default'">
              {{ record.super_admin ? 'Super Admin' : 'Admin' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'roles'">
            <a-space wrap>
              <a-tag v-for="role in record.roles" :key="role.id" color="blue">
                {{ role.name }}
              </a-tag>
              <span v-if="record.roles.length === 0" style="color: #999;">Chưa có vai trò</span>
            </a-space>
          </template>
          <template v-if="column.key === 'actions'">
            <a-button type="link" size="small" @click="openEditModal(record)">
              Phân quyền
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <!-- Modal phân quyền -->
    <a-modal
      v-model:open="editModalVisible"
      title="Phân quyền cho Admin"
      @ok="handleUpdateRoles"
      @cancel="closeEditModal"
      :confirm-loading="submitting"
    >
      <a-form layout="vertical">
        <a-form-item label="Super Admin">
          <a-switch v-model:checked="editForm.super_admin" />
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Super Admin có tất cả quyền
          </div>
        </a-form-item>
        
        <a-form-item label="Vai trò" v-if="!editForm.super_admin">
          <a-select
            v-model:value="editForm.role_ids"
            mode="multiple"
            placeholder="Chọn vai trò"
            :options="roleOptions"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  admins: Array,
  roles: Array,
  admin: Object,
})

const editModalVisible = ref(false)
const submitting = ref(false)
const currentAdminId = ref(null)

const editForm = reactive({
  super_admin: false,
  role_ids: [],
})

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: 'Tên',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Loại',
    key: 'super_admin',
    width: 120,
  },
  {
    title: 'Vai trò',
    key: 'roles',
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
]

const roleOptions = props.roles.map(role => ({
  label: role.name,
  value: role.id,
}))

const openEditModal = (admin) => {
  currentAdminId.value = admin.id
  editForm.super_admin = admin.super_admin
  editForm.role_ids = admin.roles.map(r => r.id)
  editModalVisible.value = true
}

const closeEditModal = () => {
  editModalVisible.value = false
  currentAdminId.value = null
  editForm.super_admin = false
  editForm.role_ids = []
}

const handleUpdateRoles = () => {
  submitting.value = true
  router.put(`/admin/permissions/admins/${currentAdminId.value}/roles`, editForm, {
    onSuccess: () => {
      message.success('Đã cập nhật quyền thành công')
      closeEditModal()
      router.reload({ only: ['admins'] })
    },
    onError: () => {
      message.error('Có lỗi xảy ra')
      submitting.value = false
    },
  })
}
</script>

