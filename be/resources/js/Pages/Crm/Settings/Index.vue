<template>
  <Head title="Cấu hình hệ thống | Annha CRM" />

  <PageHeader title="Cấu hình & Hệ thống" subtitle="Quản lý toàn diện vận hành, phân quyền và hạ tầng hệ thống">
    <template #actions>
      <a-button type="primary" size="large" class="premium-button shadow-blue" @click="router.reload()">
        <template #icon><ReloadOutlined /></template>
        Làm mới hệ thống
      </a-button>
    </template>
  </PageHeader>

  <div class="px-8 pb-12">
    <!-- System Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div v-for="(val, label) in {
        'Phiên bản PHP': stats.php_version,
        'Phiên bản Laravel': stats.laravel_version,
        'Dung lượng Database': stats.db_size,
        'Quản trị viên': stats.admin_count
      }" :key="label" class="stats-card">
        <div class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{{ label }}</div>
        <div class="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {{ val }}
        </div>
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="crm-tabs-premium">
      <!-- Tab 1: System Overview -->
      <a-tab-pane key="system" tab="Tổng quan Hệ thống">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="glass-card p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CloudServerOutlined class="text-crm-primary" /> Thông tin Hạ tầng
              </h3>
              <div class="grid grid-cols-2 gap-y-4">
                <div v-for="(val, key) in {
                  'Môi trường': 'Production',
                  'Database Type': 'MySQL / MariaDB',
                  'Database Name': stats.database,
                  'App URL': 'https://bed-app-annha.betech.jsc',
                  'Caching': 'Redis / File',
                  'Storage': 'Local / Public S3'
                }" :key="key">
                  <div class="text-xs text-gray-400 mb-0.5">{{ key }}</div>
                  <div class="text-sm font-medium text-gray-700">{{ val }}</div>
                </div>
              </div>
            </div>

            <div class="glass-card p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <HistoryOutlined class="text-crm-primary" /> Hoạt động mới nhất
              </h3>
              <a-list item-layout="horizontal" :data-source="[]">
                <template #emptyText>
                  <div class="py-4 text-center text-gray-400 italic">Không có hoạt động hệ thống gần đây</div>
                </template>
              </a-list>
            </div>
          </div>

          <div class="space-y-6">
            <div class="glass-card p-6 bg-gradient-to-br from-crm-primary to-crm-primary-dark text-white border-0">
              <h3 class="text-lg font-bold text-white/90 mb-4">Trạng thái API</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-white/70">Main API</span>
                  <a-badge status="success" text="Online" class="badge-white" />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-white/70">Mobile Bridge</span>
                  <a-badge status="success" text="Online" class="badge-white" />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-white/70">Push Notification</span>
                  <a-badge status="processing" text="Standby" class="badge-white" />
                </div>
              </div>
              <a-divider class="border-white/10" />
              <div class="text-xs text-white/50 text-center">Tất cả hệ thống vận hành bình thường</div>
            </div>

            <div class="glass-card p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">Thông tin Bản quyền</h3>
              <div class="text-center py-4">
                <div class="w-16 h-16 rounded-full bg-crm-primary/10 flex items-center justify-center mx-auto mb-4">
                  <SafetyCertificateOutlined class="text-2xl text-crm-primary" />
                </div>
                <div class="font-bold">Annha CRM Enterprise</div>
                <div class="text-xs text-gray-400">License: ANNHA-JSC-2026-X1</div>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- Tab 2: Branding & Logo -->
      <a-tab-pane key="branding" tab="Thương hiệu & Logo">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Logo Upload -->
          <div class="glass-card p-8">
            <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <PictureOutlined class="text-crm-primary" /> Logo Hệ thống
            </h3>
            <p class="text-sm text-gray-400 mb-6">Upload logo hiển thị trên sidebar, email và báo cáo. Định dạng: PNG, JPG, SVG, WebP (tối đa 2MB).</p>

            <!-- Current Logo Preview -->
            <div class="mb-6">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Logo hiện tại</div>
              <div class="logo-preview-box">
                <img v-if="branding.logo" :src="`/storage/${branding.logo}`" alt="Logo" class="max-h-20 max-w-48 object-contain" />
                <div v-else class="text-center py-6">
                  <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-crm-primary to-crm-primary-light flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">B</div>
                  <div class="text-sm text-gray-400">Chưa có logo tùy chỉnh</div>
                </div>
              </div>
            </div>

            <!-- Upload Area -->
            <div class="upload-drop-zone" @click="triggerLogoUpload" @dragover.prevent @drop.prevent="handleLogoDrop">
              <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="hidden" @change="handleLogoSelect" />
              <UploadOutlined class="text-3xl text-gray-300 mb-2" />
              <div class="text-sm font-semibold text-gray-600">Kéo thả hoặc click để chọn logo</div>
              <div class="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP • Tối đa 2MB</div>
            </div>

            <a-button
              v-if="logoFile"
              type="primary"
              size="large"
              block
              class="mt-4 premium-button"
              :loading="logoUploading"
              @click="uploadLogo"
            >
              <template #icon><CloudUploadOutlined /></template>
              Upload Logo mới
            </a-button>

            <!-- Preview of selected file -->
            <div v-if="logoPreview" class="mt-4 p-4 bg-gray-50 rounded-xl">
              <div class="text-xs text-gray-400 mb-2">Xem trước:</div>
              <img :src="logoPreview" alt="Preview" class="max-h-16 object-contain" />
            </div>
          </div>

          <!-- App Branding -->
          <div class="glass-card p-8">
            <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <EditOutlined class="text-crm-primary" /> Thông tin Ứng dụng
            </h3>
            <p class="text-sm text-gray-400 mb-6">Tên ứng dụng và tagline hiển thị trên giao diện.</p>

            <a-form layout="vertical">
              <a-form-item label="Tên ứng dụng">
                <a-input v-model:value="brandingForm.app_name" size="large" placeholder="VD: Annha CRM" />
              </a-form-item>
              <a-form-item label="Tagline / Mô tả ngắn">
                <a-input v-model:value="brandingForm.app_tagline" size="large" placeholder="VD: Construction ERP" />
              </a-form-item>
              <a-button type="primary" size="large" block class="premium-button" @click="saveBranding" :loading="brandingSaving">
                Lưu thông tin
              </a-button>
            </a-form>

            <!-- Preview -->
            <div class="mt-8 p-6 bg-gray-900 rounded-2xl">
              <div class="text-xs text-gray-500 mb-3 uppercase tracking-wider">Xem trước Sidebar</div>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-crm-primary to-crm-primary-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                  <img v-if="branding.logo" :src="`/storage/${branding.logo}`" alt="" class="w-full h-full object-cover" />
                  <span v-else>{{ (brandingForm.app_name || 'B').charAt(0) }}</span>
                </div>
                <div>
                  <div class="text-white font-bold text-base leading-tight">{{ brandingForm.app_name || 'Annha CRM' }}</div>
                  <div class="text-white/40 text-xs">{{ brandingForm.app_tagline || 'Construction ERP' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- Tab 3: SMTP Configuration -->
      <a-tab-pane key="smtp" tab="Cấu hình Email (SMTP)">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <div class="glass-card p-8">
              <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <MailOutlined class="text-crm-primary" /> Máy chủ SMTP
              </h3>
              <p class="text-sm text-gray-400 mb-6">Cấu hình gửi email thông báo, đặt lại mật khẩu, và email hệ thống.</p>

              <a-form layout="vertical">
                <a-row :gutter="16">
                  <a-col :span="16">
                    <a-form-item label="SMTP Host">
                      <a-input v-model:value="smtpForm.host" size="large" placeholder="smtp.gmail.com" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="Port">
                      <a-input-number v-model:value="smtpForm.port" size="large" :min="1" :max="65535" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="Username / Email">
                      <a-input v-model:value="smtpForm.username" size="large" placeholder="your@email.com" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="Password / App Password">
                      <a-input-password v-model:value="smtpForm.password" size="large" placeholder="••••••••" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="Mã hóa (Encryption)">
                  <a-radio-group v-model:value="smtpForm.encryption" size="large" button-style="solid">
                    <a-radio-button value="tls">TLS</a-radio-button>
                    <a-radio-button value="ssl">SSL</a-radio-button>
                    <a-radio-button value="null">Không mã hóa</a-radio-button>
                  </a-radio-group>
                </a-form-item>

                <a-divider>Thông tin Người gửi</a-divider>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="Email người gửi (From)">
                      <a-input v-model:value="smtpForm.from_address" size="large" placeholder="noreply@company.com" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="Tên hiển thị">
                      <a-input v-model:value="smtpForm.from_name" size="large" placeholder="Annha CRM System" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <div class="flex gap-3">
                  <a-button type="primary" size="large" class="premium-button flex-1" :loading="smtpSaving" @click="saveSmtp">
                    <template #icon><SaveOutlined /></template>
                    Lưu cấu hình SMTP
                  </a-button>
                </div>
              </a-form>
            </div>
          </div>

          <!-- Test SMTP Sidebar -->
          <div class="space-y-6">
            <div class="glass-card p-6">
              <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <SendOutlined class="text-crm-primary" /> Gửi email thử
              </h3>
              <p class="text-sm text-gray-400 mb-4">Kiểm tra kết nối SMTP bằng cách gửi email test.</p>
              <a-form layout="vertical">
                <a-form-item label="Email nhận test">
                  <a-input v-model:value="testEmail" size="large" placeholder="test@email.com" />
                </a-form-item>
                <a-button type="primary" size="large" block ghost class="premium-button" :loading="testingSmtp" @click="sendTestEmail">
                  <template #icon><SendOutlined /></template>
                  Gửi email test
                </a-button>
              </a-form>
            </div>

            <!-- SMTP Tips -->
            <div class="glass-card p-6">
              <h3 class="font-bold text-gray-800 mb-3">💡 Hướng dẫn nhanh</h3>
              <div class="space-y-3 text-sm text-gray-500">
                <div class="flex gap-2">
                  <span class="font-bold text-crm-primary">Gmail:</span>
                  <span>smtp.gmail.com, Port 587, TLS</span>
                </div>
                <div class="flex gap-2">
                  <span class="font-bold text-crm-primary">Outlook:</span>
                  <span>smtp.office365.com, Port 587, TLS</span>
                </div>
                <div class="flex gap-2">
                  <span class="font-bold text-crm-primary">Zoho:</span>
                  <span>smtp.zoho.com, Port 465, SSL</span>
                </div>
                <a-alert type="info" show-icon class="mt-4 rounded-xl">
                  <template #message>
                    <span class="text-xs">Với Gmail, bạn cần tạo <strong>App Password</strong> thay vì dùng mật khẩu chính.</span>
                  </template>
                </a-alert>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- Tab 4: Admins -->
      <a-tab-pane key="admins" tab="Quản trị viên">
        <div class="glass-card">
          <a-table :data-source="admins" :columns="adminCols" :pagination="false" class="premium-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-3">
                  <a-avatar class="bg-gradient-to-br from-blue-500 to-indigo-600 font-bold uppercase">
                    {{ record.name.charAt(0) }}
                  </a-avatar>
                  <div>
                    <div class="font-bold text-gray-800">{{ record.name }}</div>
                    <div class="text-xs text-gray-400">{{ record.email }}</div>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'roles'">
                <div class="flex flex-wrap gap-1">
                  <a-tag v-if="record.super_admin" color="error" class="rounded-full px-3">Super Admin</a-tag>
                  <a-tag v-for="role in record.roles" :key="role" color="blue" class="rounded-full px-3">
                    {{ role }}
                  </a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button type="text" shape="circle"><EditOutlined /></a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- Tab 5: Roles -->
      <a-tab-pane key="roles" tab="Vai trò & Quyền">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="role in roles" :key="role.id" class="role-card">
            <div class="flex justify-between items-start mb-4">
              <div class="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-crm-primary">
                <SafetyOutlined style="font-size: 24px;" />
              </div>
              <a-button type="text" shape="circle"><SettingOutlined /></a-button>
            </div>
            <h4 class="text-lg font-bold text-gray-800 mb-1">{{ role.name }}</h4>
            <p class="text-sm text-gray-400 line-clamp-2 h-10 mb-6">{{ role.description || 'Không có mô tả cho vai trò này.' }}</p>
            <div class="flex items-center justify-between pt-4 border-t border-gray-50">
              <div class="text-xs font-semibold text-gray-500">
                <span class="text-crm-primary">{{ role.permission_count }}</span> Permissions
              </div>
              <div class="text-xs font-semibold text-gray-500">
                <span class="text-crm-primary">{{ role.admins_count }}</span> Admins
              </div>
            </div>
          </div>
          <div class="role-card border-dashed flex flex-center cursor-pointer hover:border-crm-primary group" @click="router.visit('/admin/roles/create')">
            <div class="text-center py-6">
              <PlusOutlined class="text-4xl text-gray-200 group-hover:text-crm-primary transition-colors mb-2" />
              <div class="font-bold text-gray-400 group-hover:text-crm-primary transition-colors">Thêm vai trò mới</div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- Tab 6: General Settings -->
      <a-tab-pane key="config" tab="Tham số vận hành">
        <div class="glass-card p-6">
          <div class="max-w-2xl">
            <h3 class="text-lg font-bold text-gray-800 mb-6">Tham số vận hành</h3>
            <a-form layout="vertical">
              <div v-for="s in generalSettings" :key="s.id" class="mb-6 pb-6 border-b border-gray-50 last:border-0 last:mb-0">
                <div class="flex items-center justify-between mb-2">
                  <label class="font-bold text-gray-700 text-sm">{{ s.key.replace(/_/g, ' ').toUpperCase() }}</label>
                  <a-tag color="cyan">{{ s.type }}</a-tag>
                </div>
                <div class="flex items-center gap-4">
                  <a-input v-model:value="s.value" size="large" class="bg-gray-50 border-0" />
                  <a-button type="primary" size="large" ghost @click="saveSetting(s)">Lưu</a-button>
                </div>
                <div v-if="s.description" class="text-xs text-gray-400 mt-2">{{ s.description }}</div>
              </div>
              <a-empty v-if="!generalSettings.length" description="Chưa có tham số vận hành" class="py-8" />
            </a-form>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import { message } from 'ant-design-vue'
import {
  CloudServerOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
  SettingOutlined,
  ReloadOutlined,
  PictureOutlined,
  UploadOutlined,
  CloudUploadOutlined,
  MailOutlined,
  SendOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  admins: Array,
  roles: Array,
  settings: Array,
  stats: Object,
  branding: Object,
  smtp: Object,
})

const activeTab = ref(new URLSearchParams(window.location.search).get('tab') || 'system')

// ========== Branding & Logo ==========
const logoInput = ref(null)
const logoFile = ref(null)
const logoPreview = ref(null)
const logoUploading = ref(false)
const brandingSaving = ref(false)

const brandingForm = ref({
  app_name: props.branding?.app_name || 'Annha CRM',
  app_tagline: props.branding?.app_tagline || 'Construction ERP',
})

const triggerLogoUpload = () => logoInput.value?.click()

const handleLogoSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

const handleLogoDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

const uploadLogo = () => {
  if (!logoFile.value) return
  logoUploading.value = true
  const formData = new FormData()
  formData.append('logo', logoFile.value)
  router.post('/settings/logo', formData, {
    forceFormData: true,
    onSuccess: () => {
      message.success('Đã cập nhật logo!')
      logoFile.value = null
      logoPreview.value = null
      logoUploading.value = false
    },
    onError: () => {
      message.error('Lỗi upload logo')
      logoUploading.value = false
    },
  })
}

const saveBranding = () => {
  brandingSaving.value = true
  const promises = [
    { key: 'app_name', value: brandingForm.value.app_name },
    { key: 'app_tagline', value: brandingForm.value.app_tagline },
  ]
  let completed = 0
  promises.forEach(item => {
    router.put('/settings/update', item, {
      preserveState: true,
      onSuccess: () => {
        completed++
        if (completed === promises.length) {
          message.success('Đã lưu thông tin thương hiệu!')
          brandingSaving.value = false
        }
      },
      onError: () => { brandingSaving.value = false },
    })
  })
}

// ========== SMTP ==========
const smtpForm = ref({
  host: props.smtp?.host || '',
  port: parseInt(props.smtp?.port) || 587,
  username: props.smtp?.username || '',
  password: props.smtp?.password || '',
  encryption: props.smtp?.encryption || 'tls',
  from_address: props.smtp?.from_address || '',
  from_name: props.smtp?.from_name || '',
})

const smtpSaving = ref(false)
const testingSmtp = ref(false)
const testEmail = ref('')

const saveSmtp = () => {
  smtpSaving.value = true
  router.put('/settings/smtp', smtpForm.value, {
    onSuccess: () => {
      message.success('Đã lưu cấu hình SMTP!')
      smtpSaving.value = false
    },
    onError: (errors) => {
      message.error('Lỗi lưu cấu hình: ' + Object.values(errors).flat().join(', '))
      smtpSaving.value = false
    },
  })
}

const sendTestEmail = () => {
  if (!testEmail.value) {
    message.warning('Vui lòng nhập email nhận test.')
    return
  }
  testingSmtp.value = true
  router.post('/settings/smtp/test', { email: testEmail.value }, {
    onSuccess: () => {
      message.success(`Đã gửi email test tới ${testEmail.value}!`)
      testingSmtp.value = false
    },
    onError: () => {
      message.error('Không thể gửi email test. Kiểm tra lại cấu hình SMTP.')
      testingSmtp.value = false
    },
  })
}

// ========== General Settings ==========
const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_encryption', 'smtp_from_address', 'smtp_from_name', 'app_logo', 'app_name', 'app_tagline']
const generalSettings = computed(() => (props.settings || []).filter(s => !smtpKeys.includes(s.key)))

const saveSetting = (s) => {
  router.put('/settings/update', { key: s.key, value: s.value }, {
    preserveState: true,
    onSuccess: () => message.success(`Đã lưu "${s.key}"!`),
    onError: () => message.error('Lỗi lưu cấu hình'),
  })
}

// ========== Admin Columns ==========
const adminCols = [
  { title: 'Quản trị viên', key: 'name' },
  { title: 'Vai trò', key: 'roles' },
  { title: 'Ngày tạo', dataIndex: 'created_at', width: 150 },
  { title: '', key: 'actions', width: 80, align: 'center' },
]
</script>

<style scoped>
.stats-card {
  background: white;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  box-shadow: 0 4px 20px -10px rgba(0,0,0,0.05);
  transition: transform 0.3s ease;
}
.stats-card:hover { transform: translateY(-4px); }

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid #E8ECF1;
  border-radius: 24px;
  overflow: hidden;
}

.role-card {
  background: white;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #E8ECF1;
  transition: all 0.3s ease;
}
.role-card:hover {
  box-shadow: 0 10px 40px -10px rgba(0, 112, 243, 0.1);
  transform: translateY(-4px);
  border-color: #0070f380;
}

.premium-button {
  border-radius: 12px;
  font-weight: 600;
}

.shadow-blue { box-shadow: 0 4px 14px 0 rgba(0, 118, 255, 0.39); }

.crm-tabs-premium :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}
.crm-tabs-premium :deep(.ant-tabs-tab) {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 15px;
}
.crm-tabs-premium :deep(.ant-tabs-ink-bar) {
  height: 3px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.premium-table :deep(.ant-table-thead > tr > th) {
  background: transparent;
  padding: 16px 20px;
  font-weight: 700;
  border-bottom: 1px solid #f0f0f0;
}
.premium-table :deep(.ant-table-row > td) {
  padding: 16px 20px;
}

.badge-white :deep(.ant-badge-status-text) {
  color: white !important;
  opacity: 0.8;
}

.flex-center {
  display: flex !important;
  align-items: center;
  justify-content: center;
}

.logo-preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #FAFBFC;
  border: 2px dashed #E8ECF1;
  border-radius: 20px;
  min-height: 120px;
}

.upload-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed #D0D5DD;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #FAFBFC;
}
.upload-drop-zone:hover {
  border-color: #1B4F72;
  background: #F0F7FF;
}
</style>
