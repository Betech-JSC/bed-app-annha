<template>
  <div>
    <Head :title="'Cấu hình lương - ' + employee.name" />
    
    <div class="mb-6 flex items-center justify-between">
      <div>
        <a-breadcrumbs class="mb-2">
          <a-breadcrumb-item><Link href="/hr/employees">Nhân viên</Link></a-breadcrumb-item>
          <a-breadcrumb-item>Cấu hình lương</a-breadcrumb-item>
        </a-breadcrumbs>
        <h2 class="text-2xl font-bold text-gray-800">Cấu hình lương: {{ employee.name }}</h2>
      </div>
      <a-button @click="$inertia.visit('/hr/employees')">Quay lại</a-button>
    </div>

    <a-row :gutter="24">
      <!-- Cập nhật cấu hình mới -->
      <a-col :xs="24" :lg="10">
        <a-card title="Thiết lập lương mới" :bordered="false" class="shadow-sm rounded-xl mb-6">
          <a-form layout="vertical" @finish="handleSubmit">
            <a-form-item label="Hình thức trả lương" required>
              <a-select v-model:value="form.salary_type" placeholder="Chọn hình thức">
                <a-select-option value="hourly">Theo giờ (Hourly)</a-select-option>
                <a-select-option value="daily">Theo ngày (Daily - 8h)</a-select-option>
                <a-select-option value="monthly">Lương tháng cố định (Monthly)</a-select-option>
              </a-select>
            </a-form-item>

            <div v-if="form.salary_type === 'hourly'">
              <a-form-item label="Đơn giá mỗi giờ (VNĐ)" required>
                <a-input-number 
                  v-model:value="form.hourly_rate" 
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                />
              </a-form-item>
            </div>

            <div v-if="form.salary_type === 'daily'">
              <a-form-item label="Đơn giá mỗi ngày (VNĐ)" required>
                <a-input-number 
                  v-model:value="form.daily_rate" 
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                />
              </a-form-item>
            </div>

            <div v-if="form.salary_type === 'monthly'">
              <a-form-item label="Mức lương tháng (VNĐ)" required>
                <a-input-number 
                  v-model:value="form.monthly_salary" 
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                />
              </a-form-item>
            </div>

            <a-form-item label="Đơn giá tăng ca (VNĐ)">
              <template #extra>Nếu để trống, hệ thống sẽ tự tính dựa trên lương cơ bản.</template>
              <a-input-number 
                v-model:value="form.overtime_rate" 
                class="w-full"
                :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              />
            </a-form-item>

            <a-form-item label="Ngày bắt đầu áp dụng" required>
              <a-date-picker v-model:value="form.effective_from" value-format="YYYY-MM-DD" class="w-full" />
            </a-form-item>

            <a-button type="primary" html-type="submit" :loading="form.processing" block size="large">
              Lưu cấu hình mới
            </a-button>
          </a-form>
        </a-card>

        <!-- Trạng thái hiện tại -->
        <a-card v-if="currentConfig" title="Cấu hình đang áp dụng" :bordered="false" class="shadow-sm rounded-xl border-t-4 border-green-500">
           <a-descriptions :column="1" size="small">
             <a-descriptions-item label="Hình thức">
               <a-tag color="blue">{{ translateType(currentConfig.salary_type) }}</a-tag>
             </a-descriptions-item>
             <a-descriptions-item label="Giá trị chính">
               <span class="font-bold text-green-600 text-lg">{{ formatCurrency(getMainRate(currentConfig)) }}</span>
             </a-descriptions-item>
             <a-descriptions-item label="Tăng ca">
               {{ formatCurrency(currentConfig.overtime_rate || 0) }} /giờ
             </a-descriptions-item>
             <a-descriptions-item label="Hiệu lực từ">
               {{ formatDate(currentConfig.effective_from) }}
             </a-descriptions-item>
           </a-descriptions>
        </a-card>
      </a-col>

      <!-- Lịch sử thay đổi -->
      <a-col :xs="24" :lg="14">
        <a-card title="Lịch sử điều chỉnh lương" :bordered="false" class="shadow-sm rounded-xl">
          <a-table :dataSource="configs" :columns="columns" :pagination="{ pageSize: 10 }">
             <template #bodyCell="{ column, record }">
               <template v-if="column.key === 'salary_type'">
                 {{ translateType(record.salary_type) }}
               </template>
               <template v-if="column.key === 'rate'">
                 <span class="font-semibold">{{ formatCurrency(getMainRate(record)) }}</span>
               </template>
               <template v-if="column.key === 'effective_from'">
                 {{ formatDate(record.effective_from) }}
               </template>
               <template v-if="column.key === 'status'">
                 <a-tag v-if="isCurrent(record)" color="green">Đang dùng</a-tag>
                 <a-tag v-else-if="isFuture(record)" color="orange">Tương lai</a-tag>
                 <a-tag v-else color="default">Hết hạn</a-tag>
               </template>
             </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Head, Link, useForm } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import dayjs from 'dayjs'

defineOptions({ layout: AdminLayoutAntd })

const props = defineProps({
  employee: Object,
  configs: Array,
  currentConfig: Object,
})

const form = useForm({
  salary_type: props.currentConfig?.salary_type || 'hourly',
  hourly_rate: props.currentConfig?.hourly_rate || 0,
  daily_rate: props.currentConfig?.daily_rate || 0,
  monthly_salary: props.currentConfig?.monthly_salary || 0,
  overtime_rate: props.currentConfig?.overtime_rate || 0,
  effective_from: dayjs().format('YYYY-MM-DD'),
})

const columns = [
  { title: 'Ngày hiệu lực', dataIndex: 'effective_from', key: 'effective_from' },
  { title: 'Hình thức', dataIndex: 'salary_type', key: 'salary_type' },
  { title: 'Đơn giá', key: 'rate' },
  { title: 'Tăng ca', dataIndex: 'overtime_rate', key: 'overtime' },
  { title: 'Trạng thái', key: 'status' },
]

const handleSubmit = () => {
  form.post(`/hr/employees/${props.employee.id}/salary`, {
    onSuccess: () => {
      message.success('Đã cập nhật cấu hình lương mới')
    },
  })
}

const translateType = (type) => {
  const map = { hourly: 'Theo giờ', daily: 'Theo ngày', monthly: 'Lương tháng' }
  return map[type] || type
}

const getMainRate = (record) => {
  if (record.salary_type === 'hourly') return record.hourly_rate
  if (record.salary_type === 'daily') return record.daily_rate
  if (record.salary_type === 'monthly') return record.monthly_salary
  return 0
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)
}

const formatDate = (date) => dayjs(date).format('DD/MM/YYYY')

const isCurrent = (record) => props.currentConfig?.id === record.id
const isFuture = (record) => dayjs(record.effective_from).isAfter(dayjs())

</script>
