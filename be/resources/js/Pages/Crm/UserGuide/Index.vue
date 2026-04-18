<template>
  <Head title="Hướng dẫn sử dụng CRM" />

  <PageHeader title="Hướng dẫn sử dụng" subtitle="Tài liệu hướng dẫn chi tiết các tính năng của Annha CRM">
    <template #actions>
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Tìm kiếm hướng dẫn..."
        style="width: 280px"
        allow-clear
        @search="onSearch"
        @change="onSearch"
      />
    </template>
  </PageHeader>

  <!-- Quick Start Banner -->
  <div class="guide-banner">
    <div class="guide-banner__content">
      <div class="guide-banner__icon">
        <RocketOutlined style="font-size: 36px; color: white;" />
      </div>
      <div>
        <h2 class="guide-banner__title">Chào mừng đến với Annha CRM!</h2>
        <p class="guide-banner__desc">Hệ thống quản lý dự án xây dựng toàn diện. Hãy bắt đầu với các bước nhanh bên dưới.</p>
      </div>
    </div>
    <div class="guide-banner__steps">
      <div v-for="(step, idx) in quickSteps" :key="idx" class="guide-quick-step">
        <div class="guide-quick-step__num">{{ idx + 1 }}</div>
        <div>
          <div class="guide-quick-step__title">{{ step.title }}</div>
          <div class="guide-quick-step__desc">{{ step.desc }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Guide Categories -->
  <div class="guide-grid">
    <div
      v-for="cat in filteredCategories"
      :key="cat.key"
      class="guide-category"
    >
      <div class="guide-category__header">
        <div class="guide-category__icon" :style="{ background: cat.gradient }">
          <component :is="cat.icon" style="font-size: 22px; color: white;" />
        </div>
        <div>
          <h3 class="guide-category__title">{{ cat.title }}</h3>
          <p class="guide-category__subtitle">{{ cat.articles.length }} bài hướng dẫn</p>
        </div>
      </div>
      <div class="guide-category__body">
        <div
          v-for="(art, idx) in cat.articles"
          :key="idx"
          class="guide-article"
          :class="{ 'guide-article--expanded': expandedArticle === `${cat.key}-${idx}` }"
          @click="toggleArticle(`${cat.key}-${idx}`)"
        >
          <div class="guide-article__header">
            <div class="guide-article__title">
              <FileTextOutlined class="mr-2 text-gray-400" />
              {{ art.title }}
            </div>
            <DownOutlined
              class="guide-article__arrow"
              :class="{ 'guide-article__arrow--open': expandedArticle === `${cat.key}-${idx}` }"
            />
          </div>
          <transition name="expand">
            <div v-if="expandedArticle === `${cat.key}-${idx}`" class="guide-article__content" @click.stop>
              <div v-for="(step, si) in art.steps" :key="si" class="guide-step">
                <div class="guide-step__bullet">{{ si + 1 }}</div>
                <div class="guide-step__text" v-html="step"></div>
              </div>
              <div v-if="art.tips" class="guide-tip">
                <BulbOutlined class="mr-2" style="color: #f59e0b;" />
                <span v-html="art.tips"></span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>

  <!-- FAQ Section -->
  <div class="crm-content-card mt-6">
    <div class="p-5 border-b border-gray-100">
      <h3 class="text-lg font-bold text-gray-800 m-0">
        <QuestionCircleOutlined class="mr-2 text-blue-500" />
        Câu hỏi thường gặp
      </h3>
    </div>
    <a-collapse :bordered="false" class="faq-collapse">
      <a-collapse-panel v-for="(faq, idx) in faqs" :key="idx" :header="faq.q">
        <p class="text-gray-600 text-sm leading-relaxed m-0">{{ faq.a }}</p>
      </a-collapse-panel>
    </a-collapse>
  </div>

  <!-- Support CTA -->
  <div class="guide-support">
    <div class="guide-support__content">
      <CustomerServiceOutlined style="font-size: 28px; color: #1B4F72;" />
      <div>
        <h4 class="font-bold text-gray-800 m-0">Cần hỗ trợ thêm?</h4>
        <p class="text-sm text-gray-500 m-0 mt-1">Liên hệ đội ngũ kỹ thuật Annha qua email hoặc hotline để được hỗ trợ trực tiếp.</p>
      </div>
    </div>
    <div class="flex gap-3">
      <a-button size="large" class="rounded-xl">
        <template #icon><MailOutlined /></template>
        support@annha.vn
      </a-button>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);">
        <template #icon><PhoneOutlined /></template>
        Hotline: 1900xxxx
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import { Head } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import {
  RocketOutlined,
  FileTextOutlined,
  DownOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  MailOutlined,
  PhoneOutlined,
  ProjectOutlined,
  DollarOutlined,
  TeamOutlined,
  ToolOutlined,
  SafetyOutlined,
  SettingOutlined,
  BarChartOutlined,
  FolderOpenOutlined,
  AuditOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const searchQuery = ref('')
const expandedArticle = ref(null)

const quickSteps = [
  { title: 'Đăng nhập', desc: 'Sử dụng tài khoản được cấp để đăng nhập vào hệ thống CRM' },
  { title: 'Tạo dự án', desc: 'Vào Dự án → Tạo mới → Nhập thông tin dự án' },
  { title: 'Quản lý', desc: 'Theo dõi tiến độ, chi phí, vật tư trực tiếp trên CRM' },
  { title: 'Báo cáo', desc: 'Xuất báo cáo phân tích chi tiết cho từng dự án' },
]

const categories = [
  {
    key: 'projects',
    title: 'Quản lý Dự án',
    icon: markRaw(ProjectOutlined),
    gradient: 'linear-gradient(135deg, #1B4F72, #2E86C1)',
    articles: [
      {
        title: 'Tạo dự án mới',
        steps: [
          'Vào menu <strong>Dự án & Thi công</strong> → <strong>Danh sách dự án</strong>',
          'Nhấn nút <strong>"Tạo dự án"</strong> ở góc phải trên',
          'Điền đầy đủ thông tin: Tên dự án, Mã dự án, Chủ đầu tư, Ngày bắt đầu/kết thúc',
          'Nhấn <strong>"Lưu"</strong> để hoàn tất. Dự án sẽ ở trạng thái "Lên kế hoạch"',
        ],
        tips: 'Mã dự án được hệ thống tự sinh nếu bạn để trống. Bạn có thể tùy chỉnh mã cho dễ nhớ.',
      },
      {
        title: 'Quản lý chi phí trong dự án',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Chi phí"</strong>',
          'Nhấn <strong>"Thêm chi phí"</strong> → Chọn nhóm chi phí, nhập số tiền, mô tả',
          'Gửi duyệt chi phí → Chi phí sẽ chờ Ban quản lý duyệt',
          'Sau khi duyệt, Kế toán xác nhận thanh toán',
        ],
        tips: 'Chi phí có 3 cấp duyệt: Người tạo gửi → Ban quản lý duyệt → Kế toán xác nhận.',
      },
      {
        title: 'Theo dõi tiến độ dự án',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Tiến độ"</strong>',
          'Xem biểu đồ Gantt và % hoàn thành của từng hạng mục',
          'Cập nhật tiến độ bằng cách nhấn <strong>"Cập nhật"</strong> trên từng giai đoạn',
          'Hệ thống tự tính % tổng tiến độ dự án',
        ],
      },
      {
        title: 'Nghiệm thu công trình',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Nghiệm thu"</strong>',
          'Nhấn <strong>"Tạo nghiệm thu"</strong> → Nhập tên giai đoạn, mô tả',
          'Gửi yêu cầu duyệt → Giám sát duyệt → QLDA duyệt → Khách hàng duyệt',
          'Có 3 cấp duyệt nghiệm thu tùy theo mức độ quan trọng',
        ],
      },
    ],
  },
  {
    key: 'finance',
    title: 'Tài chính & Thu chi',
    icon: markRaw(DollarOutlined),
    gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    articles: [
      {
        title: 'Quản lý hóa đơn đầu ra',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Hóa đơn"</strong>',
          'Nhấn <strong>"Thêm hóa đơn"</strong> → Nhập số hóa đơn, số tiền, ngày xuất',
          'Gửi duyệt hóa đơn → Kế toán trưởng phê duyệt',
          'Gửi hóa đơn cho khách hàng qua email trực tiếp từ hệ thống',
        ],
      },
      {
        title: 'Theo dõi thanh toán',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Thanh toán"</strong>',
          'Xem danh sách các đợt thanh toán và trạng thái',
          'Kế toán xác nhận khi đã nhận được tiền từ khách hàng',
          'Dashboard tài chính sẽ tự cập nhật số liệu tổng quan',
        ],
      },
      {
        title: 'Chi phí công ty',
        steps: [
          'Vào menu <strong>Tài chính & Thu chi</strong> → <strong>Chi phí công ty</strong>',
          'Tạo phiếu chi phí mới → Nhập nội dung, số tiền, phân loại',
          'Gửi duyệt → Ban quản lý duyệt → Kế toán xác nhận',
          'Xem thống kê chi phí theo tháng, quý, năm trên dashboard',
        ],
      },
    ],
  },
  {
    key: 'hr',
    title: 'Nhân sự & Tổ chức',
    icon: markRaw(TeamOutlined),
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    articles: [
      {
        title: 'Quản lý nhân viên',
        steps: [
          'Vào menu <strong>Nhân sự & Tổ chức</strong> → <strong>Danh sách nhân viên</strong>',
          'Xem thông tin chi tiết, vị trí, phòng ban của từng nhân viên',
          'Tìm kiếm hoặc lọc nhân viên theo phòng ban, vị trí',
        ],
      },
      {
        title: 'Quản lý KPI nhân sự',
        steps: [
          'Vào menu <strong>Nhân sự & Tổ chức</strong> → <strong>KPI nhân sự</strong>',
          'Tạo tiêu chí KPI mới cho từng phòng ban/cá nhân',
          'Nhập điểm đánh giá KPI hàng tháng',
          'Xem báo cáo hiệu suất và so sánh giữa các nhân viên',
        ],
      },
      {
        title: 'Quản lý phòng ban',
        steps: [
          'Vào menu <strong>Nhân sự & Tổ chức</strong> → <strong>Phòng ban</strong>',
          'Tạo phòng ban mới → Nhập tên, mô tả, trưởng phòng',
          'Gán nhân viên vào phòng ban tương ứng',
        ],
      },
    ],
  },
  {
    key: 'resources',
    title: 'Tài nguyên & Kho',
    icon: markRaw(ToolOutlined),
    gradient: 'linear-gradient(135deg, #ea580c, #fb923c)',
    articles: [
      {
        title: 'Quản lý vật tư',
        steps: [
          'Vào menu <strong>Tài nguyên & Kho</strong> → <strong>Vật tư xây dựng</strong>',
          'Xem danh sách vật tư với số lượng tồn kho',
          'Tạo yêu cầu vật tư mới → Gửi duyệt',
          'Theo dõi lịch sử xuất/nhập vật tư của từng dự án',
        ],
      },
      {
        title: 'Quản lý thiết bị',
        steps: [
          'Vào menu <strong>Tài nguyên & Kho</strong> → <strong>Máy móc & Thiết bị</strong>',
          'Xem trạng thái thiết bị: Sẵn sàng / Đang sử dụng / Bảo trì',
          'Gán thiết bị vào dự án cụ thể',
          'Theo dõi lịch bảo trì và chi phí thiết bị',
        ],
      },
    ],
  },
  {
    key: 'subcontractors',
    title: 'Nhà thầu phụ',
    icon: markRaw(UsergroupAddOutlined),
    gradient: 'linear-gradient(135deg, #0369a1, #38bdf8)',
    articles: [
      {
        title: 'Quản lý nhà thầu phụ',
        steps: [
          'Vào menu <strong>Dự án & Thi công</strong> → <strong>Nhà thầu phụ</strong>',
          'Thêm nhà thầu phụ mới → Nhập thông tin liên hệ, năng lực',
          'Tạo hợp đồng thầu phụ → Theo dõi tiến độ thi công',
          'Quản lý thanh toán cho nhà thầu phụ',
        ],
        tips: 'Mỗi nhà thầu phụ có thể tham gia nhiều dự án. Hệ thống theo dõi tổng giá trị hợp đồng.',
      },
    ],
  },
  {
    key: 'defects',
    title: 'Bảo hành & Sự cố',
    icon: markRaw(SafetyOutlined),
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    articles: [
      {
        title: 'Báo cáo sự cố / Lỗi thi công',
        steps: [
          'Vào chi tiết dự án → Tab <strong>"Sự cố & Bảo hành"</strong>',
          'Nhấn <strong>"Báo lỗi"</strong> → Chụp ảnh công trường, mô tả chi tiết vị trí',
          'Hệ thống tự động thông báo/giao việc cho Kỹ sư giám sát',
        ],
        tips: 'Nên sử dụng App Mobile để chụp ảnh lỗi và báo cáo trực tiếp ngay tại công trường nhằm đảm bảo tính kịp thời.'
      },
      {
        title: 'Xác nhận khắc phục lỗi (Defect Verify)',
        steps: [
          'Sau khi nhà thầu phụ/nhân viên báo cáo đã sửa xong, lỗi sẽ chuyển sang trạng thái <strong>"Chờ xác nhận"</strong>',
          'Giám sát viên vào menu <strong>Trung tâm duyệt</strong> hoặc mục Sự cố',
          'Kiểm tra hình ảnh đã sửa chữa, nếu đạt thì nhấn <strong>"Xác nhận hoàn thành"</strong>',
          'Nếu chưa đạt, có thể nhấn <strong>"Từ chối"</strong> yêu cầu sửa lại',
        ],
      }
    ]
  },
  {
    key: 'approvals',
    title: 'Trung tâm duyệt',
    icon: markRaw(AuditOutlined),
    gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
    articles: [
      {
        title: 'Quy trình duyệt chi phí',
        steps: [
          'Nhân viên tạo chi phí → <strong>Gửi duyệt</strong>',
          'Ban quản lý nhận thông báo → Vào <strong>Trung tâm duyệt</strong> → Duyệt hoặc Từ chối',
          'Nếu duyệt, Kế toán nhận thông báo → Xác nhận thanh toán',
          'Chi phí được đánh dấu "Đã thanh toán" khi hoàn tất',
        ],
      },
      {
        title: 'Duyệt yêu cầu hàng loạt',
        steps: [
          'Vào <strong>Trung tâm duyệt</strong> từ menu hoặc Dashboard',
          'Xem tất cả yêu cầu đang chờ duyệt (Chi phí, Vật tư, Thiết bị...)',
          'Duyệt từng yêu cầu hoặc chọn nhiều để duyệt đồng loạt',
        ],
        tips: 'Badge đỏ trên menu "Trung tâm duyệt" cho biết số yêu cầu đang chờ.',
      },
    ],
  },
  {
    key: 'system',
    title: 'Hệ thống & Cài đặt',
    icon: markRaw(SettingOutlined),
    gradient: 'linear-gradient(135deg, #374151, #6b7280)',
    articles: [
      {
        title: 'Phân quyền vai trò',
        steps: [
          'Vào menu <strong>Hệ thống</strong> → <strong>Phân quyền</strong>',
          'Tạo vai trò mới (VD: Giám đốc, Kế toán, QLDA...)',
          'Chọn các quyền hạn tương ứng cho vai trò',
          'Gán vai trò cho nhân viên trong phần Quản lý nhân viên',
        ],
        tips: 'Mỗi quyền có mô tả tiếng Việt rõ ràng. Hãy đọc kỹ trước khi gán.',
      },
      {
        title: 'Xem nhật ký hệ thống',
        steps: [
          'Vào menu <strong>Hệ thống</strong> → <strong>Nhật ký hệ thống</strong>',
          'Lọc log theo mức độ: Error, Warning, Info, Debug',
          'Tìm kiếm log theo nội dung hoặc ngày',
          'Tải về file log hoặc xóa log cũ khi cần',
        ],
      },
      {
        title: 'Cấu hình chung',
        steps: [
          'Vào menu <strong>Hệ thống</strong> → <strong>Cấu hình chung</strong>',
          'Cài đặt thông tin công ty: Tên, Logo, Địa chỉ',
          'Cấu hình SMTP email để gửi thông báo',
          'Tùy chỉnh các thông số hệ thống khác',
        ],
      },
    ],
  },
]

const faqs = [
  { q: 'Tôi quên mật khẩu, làm sao để đăng nhập?', a: 'Liên hệ quản trị viên hệ thống (Superadmin) để được reset mật khẩu. Hiện tại chưa hỗ trợ tự đổi mật khẩu qua email.' },
  { q: 'Làm sao để thêm nhân viên mới vào CRM?', a: 'Nhân viên đăng ký tài khoản qua App Mobile. Sau đó, quản trị viên vào CRM → Nhân sự → Gán vai trò và phòng ban cho nhân viên.' },
  { q: 'Chi phí bị từ chối, tôi phải làm gì?', a: 'Kiểm tra lý do từ chối trong phần chi tiết chi phí. Sửa lại thông tin rồi gửi duyệt lại. Bạn cũng có thể tạo chi phí hoàn toàn mới.' },
  { q: 'CRM có giống với App Mobile không?', a: 'Đúng! CRM và App Mobile đồng bộ dữ liệu hoàn toàn. Thao tác trên CRM sẽ phản ánh ngay trên Mobile và ngược lại.' },
  { q: 'Dữ liệu CRM có được backup không?', a: 'Hệ thống tự động backup database hàng ngày. Dữ liệu được lưu trữ an toàn trên cloud server.' },
  { q: 'Tôi muốn xem báo cáo tổng quan, vào đâu?', a: 'Vào menu Dự án & Thi công → Báo cáo dự án. Hoặc xem Dashboard tổng quan trên trang chủ CRM.' },
]

const toggleArticle = (key) => {
  expandedArticle.value = expandedArticle.value === key ? null : key
}

const onSearch = () => {} // Filter happens in computed

const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) return categories
  const q = searchQuery.value.toLowerCase()
  return categories
    .map(cat => ({
      ...cat,
      articles: cat.articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.steps?.some(s => s.toLowerCase().includes(q))
      ),
    }))
    .filter(cat => cat.articles.length > 0)
})
</script>

<style scoped>
/* ─── Banner ─── */
.guide-banner {
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 2rem;
  color: white;
}
.guide-banner__content {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.guide-banner__icon {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guide-banner__title { font-size: 22px; font-weight: 800; margin: 0; }
.guide-banner__desc { font-size: 14px; opacity: 0.8; margin: 4px 0 0; }

.guide-banner__steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.guide-quick-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  backdrop-filter: blur(10px);
}
.guide-quick-step__num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.guide-quick-step__title { font-weight: 700; font-size: 13px; }
.guide-quick-step__desc { font-size: 11px; opacity: 0.7; margin-top: 2px; }

/* ─── Grid ─── */
.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

/* ─── Category Card ─── */
.guide-category {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}
.guide-category:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.06);
}

.guide-category__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid #F3F5F7;
}
.guide-category__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guide-category__title { font-size: 16px; font-weight: 700; color: #1F2937; margin: 0; }
.guide-category__subtitle { font-size: 12px; color: #9CA3AF; margin: 2px 0 0; }
.guide-category__body { padding: 8px; }

/* ─── Article ─── */
.guide-article {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}
.guide-article:hover { background: #F8FAFC; }
.guide-article--expanded { background: #F0F7FF; }

.guide-article__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.guide-article__title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.guide-article__arrow {
  font-size: 10px;
  color: #9CA3AF;
  transition: transform 0.25s ease;
}
.guide-article__arrow--open { transform: rotate(180deg); }

.guide-article__content {
  padding: 0 16px 16px;
}

/* ─── Step ─── */
.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}
.guide-step__bullet {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}
.guide-step__text {
  font-size: 13px;
  color: #4B5563;
  line-height: 1.6;
}

.guide-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 16px;
  background: #FFFBEB;
  border-radius: 10px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.5;
}

/* ─── FAQ ─── */
.faq-collapse :deep(.ant-collapse-header) {
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #374151 !important;
}

/* ─── Support CTA ─── */
.guide-support {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  margin-top: 1.5rem;
}
.guide-support__content {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* ─── Expand Animation ─── */
.expand-enter-active, .expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 800px; }

/* ─── Responsive ─── */
@media (max-width: 1024px) {
  .guide-grid { grid-template-columns: 1fr; }
  .guide-banner__steps { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .guide-banner__steps { grid-template-columns: 1fr; }
  .guide-support { flex-direction: column; gap: 16px; text-align: center; }
}
</style>
