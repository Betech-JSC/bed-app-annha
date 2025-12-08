<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <template #title>
        <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 8px;">
          SkySend Admin
        </div>
      </template>
      <a-form
        :model="form"
        :rules="rules"
        @finish="handleLogin"
        layout="vertical"
      >
        <a-form-item name="email" label="Email">
          <a-input
            v-model:value="form.email"
            placeholder="Nhập email"
            size="large"
          />
        </a-form-item>
        <a-form-item name="password" label="Mật khẩu">
          <a-input-password
            v-model:value="form.password"
            placeholder="Nhập mật khẩu"
            size="large"
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="form.remember">Ghi nhớ đăng nhập</a-checkbox>
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="form.processing"
            size="large"
            block
          >
            Đăng nhập
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'

const form = useForm({
  email: '',
  password: '',
  remember: false,
})

const rules = {
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Vui lòng nhập mật khẩu', trigger: 'blur' },
  ],
}

const handleLogin = () => {
  form.post('/admin/login', {
    onError: (errors) => {
      if (errors.email) {
        message.error(errors.email[0])
      } else {
        message.error('Đăng nhập thất bại')
      }
    },
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
