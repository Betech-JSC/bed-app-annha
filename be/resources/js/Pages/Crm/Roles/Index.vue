<template>
  <Head title="Phân quyền vai trò" />

  <PageHeader title="Phân Quyền Vai Trò" subtitle="Quản lý roles và gán quyền cho từng vai trò">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo vai trò
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard :value="roles.length" label="Tổng vai trò" :icon="SafetyOutlined" variant="primary" />
    <StatCard :value="totalPermissions" label="Tổng quyền" :icon="KeyOutlined" variant="success" />
    <StatCard :value="totalUsersAssigned" label="Users đã gán" :icon="UserOutlined" variant="warning" />
    <StatCard :value="groupedPermissions.length" label="Nhóm quyền" :icon="AppstoreOutlined" variant="accent" />
  </div>

  <!-- Roles Grid -->
  <div class="roles-grid">
    <div v-for="role in roles" :key="role.id" class="role-card">
      <!-- Header -->
      <div class="role-card__header">
        <div class="role-card__avatar">
          <SafetyOutlined style="font-size: 20px;" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="role-card__name">{{ role.name }}</div>
          <div class="role-card__desc">{{ role.description || 'Chưa có mô tả' }}</div>
        </div>
        <a-dropdown trigger="click">
          <a-button type="text" size="small"><MoreOutlined /></a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="openEditModal(role)">
                <EditOutlined class="mr-2" /> Sửa vai trò
              </a-menu-item>
              <a-menu-item danger @click="confirmDelete(role)">
                <DeleteOutlined class="mr-2" /> Xóa vai trò
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <!-- Permission Tags -->
      <div class="role-card__body">
        <div class="role-card__label">
          <KeyOutlined class="mr-1" /> {{ role.permissions.length }} quyền đã gán
        </div>
        <div class="role-card__tags">
          <a-tag
            v-for="pName in role.permission_names.slice(0, 6)"
            :key="pName"
            color="blue"
            class="text-xs rounded-lg mb-1"
          >
            {{ pName }}
          </a-tag>
          <a-tag v-if="role.permission_names.length > 6" class="text-xs rounded-lg mb-1">
            +{{ role.permission_names.length - 6 }} nữa
          </a-tag>
        </div>
      </div>

      <!-- Footer -->
      <div class="role-card__footer">
        <div class="role-card__meta">
          <UserOutlined class="mr-1" /> {{ role.users_count }} người dùng
        </div>
        <a-button type="link" size="small" @click="openEditModal(role)">
          Chỉnh sửa quyền →
        </a-button>
      </div>
    </div>
  </div>

  <!-- Create / Edit Modal -->
  <a-modal
    v-model:open="showModal"
    :title="editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'"
    :width="850"
    :footer="null"
    class="role-modal"
    centered
    destroyOnClose
  >
    <div class="py-4">
      <!-- ========== ROLE TEMPLATES (only when creating) ========== -->
      <div v-if="!editingRole && roleTemplates?.length" class="mb-6">
        <div class="template-section-header">
          <ThunderboltOutlined class="mr-2" />
          <span>Chọn mẫu vai trò gợi ý</span>
          <span class="template-hint">— click để áp dụng, có thể tùy chỉnh thêm sau</span>
        </div>
        <div class="template-grid">
          <div
            v-for="(tpl, idx) in roleTemplates"
            :key="idx"
            class="template-card"
            :class="{ 'template-card--active': activeTemplate === idx }"
            @click="applyTemplate(tpl, idx)"
          >
            <div class="template-card__icon" :style="{ background: tpl.color + '18', color: tpl.color }">
              <CrownOutlined v-if="tpl.icon === 'crown'" />
              <ProjectOutlined v-else-if="tpl.icon === 'project'" />
              <DollarOutlined v-else-if="tpl.icon === 'dollar'" />
              <EyeOutlined v-else-if="tpl.icon === 'eye'" />
              <ToolOutlined v-else-if="tpl.icon === 'tool'" />
              <UserOutlined v-else />
            </div>
            <div class="template-card__info">
              <div class="template-card__name">{{ tpl.name }}</div>
              <div class="template-card__desc">{{ tpl.description }}</div>
            </div>
            <div class="template-card__badge">
              <a-badge :count="tpl.permissions.length" :number-style="{ backgroundColor: tpl.color }" />
            </div>
            <CheckCircleFilled v-if="activeTemplate === idx" class="template-card__check" :style="{ color: tpl.color }" />
          </div>
        </div>
      </div>

      <!-- Basic Info -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="form-label">Tên vai trò <span class="text-red-500">*</span></label>
          <a-input v-model:value="form.name" size="large" placeholder="VD: Quản lý dự án" class="rounded-xl" />
        </div>
        <div>
          <label class="form-label">Mô tả</label>
          <a-input v-model:value="form.description" size="large" placeholder="Mô tả ngắn về vai trò" class="rounded-xl" />
        </div>
      </div>

      <!-- Permission Selector -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <label class="form-label mb-0">Chọn quyền hạn</label>
          <div class="flex gap-2">
            <a-button size="small" type="link" @click="selectAllPermissions">Chọn tất cả</a-button>
            <a-button size="small" type="link" danger @click="deselectAllPermissions">Bỏ chọn hết</a-button>
          </div>
        </div>

        <a-collapse
          v-model:activeKey="activePermGroups"
          :bordered="false"
          class="permission-collapse"
        >
          <a-collapse-panel
            v-for="group in groupedPermissions"
            :key="group.key"
            :header="null"
          >
            <template #header>
              <div class="perm-group-header">
                <span class="perm-group-icon">
                  <FolderOutlined />
                </span>
                <span class="perm-group-name">{{ group.group }}</span>
                <a-badge
                  :count="countSelectedInGroup(group)"
                  :number-style="{ backgroundColor: countSelectedInGroup(group) > 0 ? '#1B4F72' : '#d9d9d9' }"
                  class="ml-2"
                />
                <span class="perm-group-total">/ {{ group.items.length }}</span>
              </div>
            </template>

            <div class="perm-grid">
              <label
                v-for="perm in group.items"
                :key="perm.id"
                class="perm-checkbox"
                :class="{ 'perm-checkbox--checked': form.permissions.includes(perm.id) }"
              >
                <a-checkbox
                  :checked="form.permissions.includes(perm.id)"
                  @change="togglePermission(perm.id)"
                />
                <div class="perm-checkbox__info">
                  <div class="perm-checkbox__label">{{ perm.label }}</div>
                  <div class="perm-checkbox__name">{{ perm.name }}</div>
                </div>
              </label>
            </div>

            <!-- Group quick actions -->
            <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <a-button size="small" type="dashed" @click="selectGroup(group)">
                <CheckOutlined class="mr-1" /> Chọn cả nhóm
              </a-button>
              <a-button size="small" type="dashed" @click="deselectGroup(group)">
                <CloseOutlined class="mr-1" /> Bỏ nhóm
              </a-button>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>

      <!-- Selected summary -->
      <div class="selected-summary">
        <SafetyOutlined class="mr-2" style="color: #1B4F72;" />
        <span class="font-semibold">{{ form.permissions.length }}</span> quyền đã chọn
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <a-button size="large" class="rounded-xl" @click="showModal = false">Hủy</a-button>
        <a-button
          type="primary"
          size="large"
          class="rounded-xl"
          style="background: linear-gradient(135deg, #1B4F72, #2E86C1);"
          :loading="form.processing"
          @click="submitForm"
        >
          {{ editingRole ? 'Cập nhật' : 'Tạo vai trò' }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { Modal, message } from 'ant-design-vue'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined,
  SafetyOutlined,
  KeyOutlined,
  UserOutlined,
  AppstoreOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  CheckOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  ProjectOutlined,
  DollarOutlined,
  EyeOutlined,
  ToolOutlined,
  CheckCircleFilled,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  roles: Array,
  groupedPermissions: Array,
  allPermissions: Array,
  users: Array,
  roleTemplates: Array,
})

const showModal = ref(false)
const editingRole = ref(null)
const activeTemplate = ref(null)
const activePermGroups = ref(props.groupedPermissions?.map(g => g.key) || [])

const form = useForm({
  name: '',
  description: '',
  permissions: [],
})

const totalPermissions = computed(() => props.allPermissions?.length || 0)
const totalUsersAssigned = computed(() => (props.roles || []).reduce((sum, r) => sum + (r.users_count || 0), 0))

const openCreateModal = () => {
  editingRole.value = null
  activeTemplate.value = null
  form.reset()
  form.permissions = []
  showModal.value = true
}

const openEditModal = (role) => {
  editingRole.value = role
  activeTemplate.value = null
  form.name = role.name
  form.description = role.description || ''
  form.permissions = [...role.permissions]
  showModal.value = true
}

const applyTemplate = (tpl, idx) => {
  if (activeTemplate.value === idx) {
    // Deselect template
    activeTemplate.value = null
    form.name = ''
    form.description = ''
    form.permissions = []
    return
  }
  activeTemplate.value = idx
  form.name = tpl.name
  form.description = tpl.description
  form.permissions = [...tpl.permissions]
  message.success(`Đã áp dụng mẫu "${tpl.name}" — ${tpl.permissions.length} quyền`)
}

const confirmDelete = (role) => {
  Modal.confirm({
    title: `Xóa vai trò "${role.name}"?`,
    content: `Vai trò này có ${role.users_count} người dùng. Bạn có chắc chắn muốn xóa?`,
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    onOk: () => {
      router.delete(`/roles/${role.id}`)
    },
  })
}

const togglePermission = (id) => {
  activeTemplate.value = null // clear template selection when manually editing
  const idx = form.permissions.indexOf(id)
  if (idx > -1) {
    form.permissions.splice(idx, 1)
  } else {
    form.permissions.push(id)
  }
}

const countSelectedInGroup = (group) => {
  return group.items.filter(p => form.permissions.includes(p.id)).length
}

const selectGroup = (group) => {
  activeTemplate.value = null
  group.items.forEach(p => {
    if (!form.permissions.includes(p.id)) form.permissions.push(p.id)
  })
}

const deselectGroup = (group) => {
  activeTemplate.value = null
  const ids = group.items.map(p => p.id)
  form.permissions = form.permissions.filter(id => !ids.includes(id))
}

const selectAllPermissions = () => {
  activeTemplate.value = null
  form.permissions = (props.allPermissions || []).map(p => p.id)
}

const deselectAllPermissions = () => {
  activeTemplate.value = null
  form.permissions = []
}

const submitForm = () => {
  if (editingRole.value) {
    form.put(`/roles/${editingRole.value.id}`, {
      onSuccess: () => {
        showModal.value = false
        message.success('Cập nhật vai trò thành công')
      },
    })
  } else {
    form.post('/roles', {
      onSuccess: () => {
        showModal.value = false
        message.success('Tạo vai trò thành công')
      },
    })
  }
}
</script>

<style scoped>
/* ─── Roles Grid ─── */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.role-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.role-card:hover {
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.role-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F3F5F7;
}

.role-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.role-card__name { font-weight: 700; font-size: 15px; color: #1F2937; }
.role-card__desc { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.role-card__body { padding: 16px 20px; }
.role-card__label { font-size: 12px; font-weight: 600; color: #5D6B82; margin-bottom: 10px; }
.role-card__tags { display: flex; flex-wrap: wrap; gap: 4px; }

.role-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #F3F5F7;
  background: #FAFBFC;
}
.role-card__meta { font-size: 12px; color: #9CA3AF; }

/* ─── Template Section ─── */
.template-section-header {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 12px;
}
.template-hint {
  font-weight: 400;
  font-size: 12px;
  color: #9CA3AF;
  margin-left: 4px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.template-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 2px solid #E8ECF1;
  background: white;
  cursor: pointer;
  transition: all 0.25s ease;
}
.template-card:hover {
  border-color: #B0C4DE;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.template-card--active {
  border-color: #1B4F72;
  background: linear-gradient(135deg, rgba(27,79,114,0.03), rgba(46,134,193,0.05));
  box-shadow: 0 0 0 1px rgba(27,79,114,0.2), 0 4px 16px rgba(27,79,114,0.1);
}

.template-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.template-card__info {
  flex: 1;
  min-width: 0;
}
.template-card__name {
  font-weight: 600;
  font-size: 13px;
  color: #1F2937;
  line-height: 1.3;
}
.template-card__desc {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-card__badge {
  flex-shrink: 0;
}

.template-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
}

/* ─── Permission Collapse ─── */
.permission-collapse :deep(.ant-collapse-header) {
  padding: 12px 16px !important;
  border-radius: 12px !important;
  background: #FAFBFC !important;
  margin-bottom: 4px !important;
}

.perm-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perm-group-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(27, 79, 114, 0.08);
  color: #1B4F72;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.perm-group-name { font-weight: 600; font-size: 14px; color: #1F2937; }
.perm-group-total { font-size: 12px; color: #9CA3AF; }

/* ─── Permission Grid ─── */
.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.perm-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #E8ECF1;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}
.perm-checkbox:hover { border-color: #2E86C1; background: #F0F7FF; }
.perm-checkbox--checked {
  border-color: #1B4F72;
  background: linear-gradient(135deg, rgba(27, 79, 114, 0.04), rgba(46, 134, 193, 0.06));
  box-shadow: 0 0 0 1px rgba(27, 79, 114, 0.15);
}

.perm-checkbox__label { font-weight: 600; font-size: 13px; color: #1F2937; }
.perm-checkbox__name { font-size: 11px; color: #9CA3AF; font-family: monospace; }

/* ─── Selected Summary ─── */
.selected-summary {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(27, 79, 114, 0.04);
  border-radius: 12px;
  font-size: 13px;
  color: #1B4F72;
}

/* ─── Form ─── */
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

/* ─── Modal Override ─── */
.role-modal :deep(.ant-modal-header) {
  border-radius: 16px 16px 0 0;
}
.role-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}
</style>
