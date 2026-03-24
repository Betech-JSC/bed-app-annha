<template>
  <div>
    <Head title="Đăng nhập" />
    <div class="login-page">
      <!-- Animated background -->
      <div class="login-bg">
        <div class="login-bg__shape login-bg__shape--1"></div>
        <div class="login-bg__shape login-bg__shape--2"></div>
        <div class="login-bg__shape login-bg__shape--3"></div>
      </div>

      <div class="login-container">
        <!-- Left: Branding -->
        <div class="login-branding">
          <div class="login-branding__content">
            <div class="login-branding__logo">
              <div class="login-branding__logo-icon">
                <svg width="28" height="28" viewBox="0 0 35 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.8678 35.0872C19.3542 35.0872 18.8496 33.8828 18.3613 32.2389L15.7734 23.6452C15.4642 22.5547 15.513 22.0013 16.1478 21.334L32.7656 3.41406C32.9609 3.20247 32.9447 2.95833 32.7819 2.79557C32.6191 2.64909 32.375 2.61654 32.1634 2.81185L14.3086 19.4948C13.6087 20.1458 13.0228 20.1784 11.9811 19.8529L3.19206 17.1836C1.62956 16.7116 0.490234 16.207 0.490234 14.7096C0.490234 13.5215 1.54818 12.6914 2.91536 12.1706L30.9102 1.44466C31.6589 1.15169 32.3262 0.988933 32.8796 0.988933C33.9375 0.988933 34.5885 1.63998 34.5885 2.69792C34.5885 3.2513 34.4258 3.91862 34.1328 4.66732L23.472 32.5156C22.8698 34.0781 22.0397 35.0872 20.8678 35.0872Z" fill="white"/></svg>
              </div>
            </div>
            <h1 class="login-branding__title">Annha CRM</h1>
            <p class="login-branding__subtitle">Construction Management Platform</p>
            <div class="login-branding__divider"></div>
            <p class="login-branding__desc">
              Quản lý dự án xây dựng, nhân sự, tài chính<br>
              và vật tư trong một nền tảng duy nhất.
            </p>

            <div class="login-branding__features">
              <div class="login-branding__feature">
                <div class="login-branding__feature-dot"></div>
                <span>Quản lý dự án thông minh</span>
              </div>
              <div class="login-branding__feature">
                <div class="login-branding__feature-dot"></div>
                <span>Báo cáo tài chính real-time</span>
              </div>
              <div class="login-branding__feature">
                <div class="login-branding__feature-dot"></div>
                <span>Phân quyền linh hoạt</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Login Form -->
        <div class="login-form-wrapper">
          <div class="login-form-card">
            <div class="login-form-card__header">
              <!-- Mobile logo -->
              <div class="login-form-card__mobile-logo">
                <div class="login-branding__logo-icon" style="width: 40px; height: 40px;">
                  <svg width="20" height="20" viewBox="0 0 35 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.8678 35.0872C19.3542 35.0872 18.8496 33.8828 18.3613 32.2389L15.7734 23.6452C15.4642 22.5547 15.513 22.0013 16.1478 21.334L32.7656 3.41406C32.9609 3.20247 32.9447 2.95833 32.7819 2.79557C32.6191 2.64909 32.375 2.61654 32.1634 2.81185L14.3086 19.4948C13.6087 20.1458 13.0228 20.1784 11.9811 19.8529L3.19206 17.1836C1.62956 16.7116 0.490234 16.207 0.490234 14.7096C0.490234 13.5215 1.54818 12.6914 2.91536 12.1706L30.9102 1.44466C31.6589 1.15169 32.3262 0.988933 32.8796 0.988933C33.9375 0.988933 34.5885 1.63998 34.5885 2.69792C34.5885 3.2513 34.4258 3.91862 34.1328 4.66732L23.472 32.5156C22.8698 34.0781 22.0397 35.0872 20.8678 35.0872Z" fill="#1B4F72"/></svg>
                </div>
              </div>
              <h2 class="login-form-card__title">Chào mừng trở lại</h2>
              <p class="login-form-card__subtitle">Đăng nhập để tiếp tục</p>
            </div>

            <a-form
              :model="form"
              :rules="rules"
              layout="vertical"
              @finish="handleLogin"
              class="login-form"
            >
              <a-form-item name="email" label="Email">
                <a-input
                  v-model:value="form.email"
                  size="large"
                  placeholder="email@company.com"
                  class="login-input"
                >
                  <template #prefix>
                    <UserOutlined class="text-gray-400" />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item name="password" label="Mật khẩu">
                <a-input-password
                  v-model:value="form.password"
                  size="large"
                  placeholder="••••••••"
                  class="login-input"
                >
                  <template #prefix>
                    <LockOutlined class="text-gray-400" />
                  </template>
                </a-input-password>
              </a-form-item>

              <div class="flex items-center justify-between mb-6">
                <a-checkbox v-model:checked="form.remember">
                  <span class="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                </a-checkbox>
              </div>

              <a-button
                type="primary"
                html-type="submit"
                size="large"
                :loading="form.processing"
                block
                class="login-btn"
              >
                <template #icon v-if="!form.processing">
                  <LoginOutlined />
                </template>
                Đăng nhập
              </a-button>
            </a-form>

            <div class="login-form-card__footer">
              <p class="text-xs text-gray-400 text-center">
                © {{ new Date().getFullYear() }} Annha JSC. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Head, useForm } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
} from '@ant-design/icons-vue'

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
        message.error(errors.email[0] || errors.email)
      } else {
        message.error('Đăng nhập thất bại')
      }
    },
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0C1B2A 0%, #1B4F72 50%, #154360 100%);
}

/* Animated background shapes */
.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.login-bg__shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
  background: white;
  animation: float 20s ease-in-out infinite;
}

.login-bg__shape--1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -100px;
}

.login-bg__shape--2 {
  width: 400px;
  height: 400px;
  bottom: -150px;
  left: -100px;
  animation-delay: -5s;
  animation-duration: 25s;
}

.login-bg__shape--3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 40%;
  animation-delay: -10s;
  animation-duration: 30s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(10px, -10px) scale(1.02); }
}

/* Container */
.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
}

/* Left branding */
.login-branding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.login-branding__content {
  max-width: 420px;
}

.login-branding__logo {
  margin-bottom: 1.5rem;
}

.login-branding__logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 24px;
}

.login-branding__title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.login-branding__subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
  font-weight: 500;
}

.login-branding__divider {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #F39C12, #F7DC6F);
  border-radius: 2px;
  margin: 2rem 0;
}

.login-branding__desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.7;
}

.login-branding__features {
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-branding__feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.login-branding__feature-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #F39C12;
  flex-shrink: 0;
}

/* Right form */
.login-form-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-form-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
}

.login-form-card__mobile-logo {
  display: none;
  margin-bottom: 1rem;
}

.login-form-card__header {
  margin-bottom: 2rem;
}

.login-form-card__title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1A1A2E;
  letter-spacing: -0.01em;
}

.login-form-card__subtitle {
  font-size: 0.9rem;
  color: #9CA3AF;
  margin-top: 0.5rem;
}

/* Form inputs */
.login-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.login-input :deep(.ant-input),
.login-input :deep(.ant-input-password) {
  border-radius: 12px !important;
}

.login-input {
  border-radius: 12px !important;
}

/* Login button */
.login-btn {
  height: 48px !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  background: linear-gradient(135deg, #1B4F72, #2E86C1) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(27, 79, 114, 0.3) !important;
  transition: all 0.3s ease !important;
}

.login-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 20px rgba(27, 79, 114, 0.4) !important;
}

.login-btn:active {
  transform: translateY(0) !important;
}

.login-form-card__footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #F3F4F6;
}

/* Responsive */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
  }

  .login-branding {
    display: none;
  }

  .login-form-card__mobile-logo {
    display: block;
  }

  .login-form-card {
    border-radius: 20px;
    padding: 2rem;
  }
}
</style>
