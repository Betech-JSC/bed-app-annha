<template>
  <Head title="Trung Tâm Duyệt" />

  <PageHeader
    title="Trung Tâm Duyệt"
    subtitle="Duyệt nhanh theo vai trò của bạn"
  >
    <template #actions>
      <a-button size="large" class="rounded-xl" @click="refreshPage">
        <template #icon><ReloadOutlined /></template>
        Làm mới
      </a-button>
    </template>
  </PageHeader>

  <a-spin :spinning="isRefreshing" tip="Đang cập nhật dữ liệu...">
    <!-- ─── Stats Overview ─── -->
    <div class="ac-stats-grid">
      <div class="ac-stat-card">
        <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%)">
          <ClockCircleOutlined />
        </div>
        <div class="ac-stat-card__content">
          <div class="ac-stat-card__value">{{ totalPending }}</div>
          <div class="ac-stat-card__label">Chờ duyệt</div>
        </div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%)">
          <CheckCircleOutlined />
        </div>
        <div class="ac-stat-card__content">
          <div class="ac-stat-card__value">{{ stats.approved_today || 0 }}</div>
          <div class="ac-stat-card__label">Đã duyệt hôm nay</div>
        </div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%)">
          <CloseCircleOutlined />
        </div>
        <div class="ac-stat-card__content">
          <div class="ac-stat-card__value">{{ stats.rejected_today || 0 }}</div>
          <div class="ac-stat-card__label">Từ chối</div>
        </div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)">
          <DollarOutlined />
        </div>
        <div class="ac-stat-card__content">
          <div class="ac-stat-card__value ac-stat-card__value--amount">{{ formatCompact(stats.total_pending_amount) }}</div>
          <div class="ac-stat-card__label">Tổng giá trị chờ duyệt</div>
        </div>
      </div>
    </div>

    <!-- ─── Unified Control Bar (UX Optimized) ─── -->
    <div class="ac-controls shadow-sm">
      <div class="ac-controls__main">
        <!-- Role Selector -->
        <a-radio-group v-model:value="activeRole" button-style="solid" size="large" class="role-selector">
          <a-radio-button v-for="tab in roleTabs" :key="tab.key" :value="tab.key">
            <div class="flex items-center gap-2">
              <component :is="tab.icon" />
              <span>{{ tab.label }}</span>
              <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
            </div>
          </a-radio-button>
        </a-radio-group>
        
        <div class="flex-grow"></div>

        <!-- Sync Button -->
        <a-button shape="circle" @click="refreshPage" class="flex items-center justify-center" :loading="isRefreshing">
          <template #icon><ReloadOutlined v-if="!isRefreshing" /></template>
        </a-button>
      </div>

      <div class="ac-controls__filters">
        <!-- Category Filter -->
        <div class="filter-group">
          <span class="filter-label"><AppstoreOutlined /> Nhóm phiếu:</span>
          <a-segmented
            v-model:value="activeCategory"
            :options="[
              { label: 'Tất cả', value: 'all' },
              { label: 'Tài chính', value: 'finance' },
              { label: 'Nghiệm thu', value: 'acceptance' },
              { label: 'Vận hành', value: 'technical' },
              { label: 'Nhân sự', value: 'hr' }
            ]"
          />
        </div>

        <!-- Status Filter -->
        <div class="filter-group">
          <span class="filter-label"><FilterOutlined /> Trạng thái:</span>
          <a-segmented 
            v-model:value="activeStatus" 
            :options="[
              { label: 'Đang chờ', value: 'pending' },
              { label: 'Nháp', value: 'draft' },
              { label: 'Từ chối', value: 'rejected' },
              { label: 'Đã duyệt', value: 'approved' },
              { label: 'Tất cả', value: 'all' }
            ]"
          />
        </div>
      </div>
    </div>
  </a-spin>

  <!-- ─── Items Table (Enhanced) ─── -->
  <a-spin :spinning="isRefreshing" tip="Đang tải danh sách...">
    <div class="ac-table-card mt-6">
      <div class="p-4 border-b flex justify-between items-center bg-gray-50/50">
        <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">
          DANH SÁCH YÊU CẦU ({{ activeItems.length }})
        </div>
        <div class="flex gap-2">
          <a-tag v-if="activeStatus === 'pending'" color="orange" class="rounded-lg">Đang chờ xử lý</a-tag>
          <a-tag v-else-if="activeStatus === 'rejected'" color="error" class="rounded-lg">Đã từ chối</a-tag>
        </div>
      </div>
      <a-table
        :columns="tableColumns"
        :data-source="activeItems"
        :pagination="{ pageSize: 15, showTotal: (t) => `${t} yêu cầu`, showSizeChanger: true }"
        row-key="id"
        size="middle"
        class="ac-table"
        :scroll="{ x: 1000 }"
        :loading="isRefreshing"
      >
      <template #bodyCell="{ column, record }">
        <!-- Status Tag (New in Table) -->
        <template v-if="column.key === 'status'">
          <div class="flex flex-col gap-1">
            <a-tag :color="historyStatusColor(record.status)" class="rounded-md text-[10px] uppercase font-bold w-fit">
              {{ statusViMap[record.status] || record.status }}
            </a-tag>
            <div v-if="record.next_action" class="flex items-center gap-1.5 mt-0.5">
              <span class="w-1 h-1 rounded-full bg-blue-400"></span>
              <span class="text-[10px] text-blue-500 font-medium whitespace-nowrap italic">
                Tiếp theo: {{ record.next_action.role }}
              </span>
            </div>
            <!-- Resubmission Badges -->
            <div v-if="record.type === 'acceptance' && record.metadata?.is_resubmitted" class="flex gap-1 mt-1">
              <a-tag color="blue" class="rounded-md text-[9px] uppercase font-bold m-0 border-0">
                Duyệt lại (Lần {{ record.metadata.rejection_count + 1 }})
              </a-tag>
              <a-tag v-if="record.metadata.open_defects_count === 0" color="success" class="rounded-md text-[9px] uppercase font-bold m-0 border-0">
                 Đã khắc phục lỗi
              </a-tag>
            </div>
          </div>
        </template>
        <!-- Loại -->
        <template v-if="column.key === 'type'">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-6 rounded-full" :style="{ backgroundColor: typeColors[record.type] || '#ccc' }"></div>
            <span class="text-xs font-medium text-gray-600">{{ record.type_label }}</span>
          </div>
        </template>
        <!-- Nội dung -->
        <template v-if="column.key === 'title'">
          <div class="ac-item-title" @click="openDetailDrawer(record)">
            <div class="ac-item-title__main">
              {{ record.title }}
              <!-- Defect Warning Badge -->
              <a-tooltip v-if="record.type === 'acceptance' && record.metadata?.open_defects_count > 0" title="Giai đoạn này đang tồn tại lỗi thi công chưa được xác nhận hoàn thành. Cần xử lý hết lỗi trước khi duyệt.">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 ml-1">
                  <WarningOutlined class="mr-0.5" /> {{ record.metadata.open_defects_count }} LỖI
                </span>
              </a-tooltip>
            </div>
            <div class="ac-item-title__sub">{{ record.subtitle }}</div>
          </div>
        </template>
        <!-- Số tiền -->
        <template v-if="column.key === 'amount'">
          <span v-if="record.amount" class="font-bold text-emerald-600 text-sm">{{ formatCompact(record.amount) }}</span>
          <span v-else class="text-gray-300">—</span>
        </template>
        <!-- Người tạo -->
        <template v-if="column.key === 'created_by'">
          <div class="flex items-center gap-2">
            <a-avatar :size="24" style="background: #1B4F72; font-size: 10px; flex-shrink: 0;">{{ record.created_by?.charAt(0)?.toUpperCase() }}</a-avatar>
            <span class="text-xs text-gray-600 truncate" style="max-width: 100px;">{{ record.created_by }}</span>
          </div>
        </template>
        <!-- Ngày tạo -->
        <template v-if="column.key === 'created_at'">
          <span class="text-xs text-gray-500">{{ record.created_at }}</span>
        </template>
        <!-- Thao tác -->
        <template v-if="column.key === 'actions'">
          <a-space :size="6">
            <a-tooltip v-if="getDetailUrl(record)" title="Vào xem chi tiết">
              <a-button
                size="small"
                class="ac-btn-detail"
                @click="navigateToDetail(record)"
              >
                <template #icon><ArrowRightOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Xem nhanh">
              <a-button
                size="small"
                class="ac-btn-eye"
                @click="openDetailDrawer(record)"
              >
                <template #icon><EyeOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip :title="record.type === 'acceptance' && record.metadata?.open_defects_count > 0 ? 'Không thể duyệt vì còn lỗi chưa xác nhận' : ''">
              <a-button
                type="primary"
                size="small"
                class="ac-btn-approve"
                :disabled="record.type === 'acceptance' && record.metadata?.open_defects_count > 0"
                @click="handleApproveByType(record)"
              >
                <template #icon><CheckOutlined /></template>
                Duyệt
              </a-button>
            </a-tooltip>
            <a-button
              danger
              size="small"
              class="ac-btn-reject"
              @click="openRejectModal(record)"
            >
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</a-spin>

  <!-- ─── Recent Activity Feed (UX Uplifted) ─── -->
  <a-spin :spinning="isRefreshing">
    <div class="ac-history-card mt-6">
      <div class="ac-history-card__header" @click="showHistory = !showHistory">
        <div class="flex items-center gap-3">
          <div class="history-pulse" v-if="recentItems.length > 0"></div>
          <HistoryOutlined class="text-blue-500" />
          <span class="font-bold text-gray-800 text-sm uppercase tracking-wide">Hoạt động xử lý gần đây</span>
          <span class="history-count">{{ recentItems.length }}</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-400 font-medium">
          {{ showHistory ? 'Thu gọn' : 'Xem chi tiết' }}
          <UpOutlined v-if="showHistory" style="font-size: 10px;" />
          <DownOutlined v-else style="font-size: 10px;" />
        </div>
      </div>

      <transition name="slide-fade">
        <div v-if="showHistory" class="ac-history-body">
          <div v-if="recentItems.length === 0" class="p-12 text-center text-gray-400">
            <HistoryOutlined style="font-size: 32px; opacity: 0.2; margin-bottom: 12px;" />
            <p>Chưa có hoạt động xử lý nào gần đây</p>
          </div>
          
          <div v-else class="ac-timeline">
            <div v-for="item in recentItems" :key="item.id" class="ac-timeline-item">
              <!-- Timeline Line/Dot -->
              <div class="ac-timeline-left">
                <div class="ac-timeline-dot" :class="item.status">
                  <CheckOutlined v-if="['approved', 'confirmed', 'paid', 'verified'].includes(item.status)" />
                  <CloseOutlined v-else-if="['rejected', 'cancelled'].includes(item.status)" />
                  <InfoCircleOutlined v-else />
                </div>
                <div class="ac-timeline-line"></div>
              </div>

              <!-- Timeline Content -->
              <div class="ac-timeline-content group" @click="openDetailDrawer(item)">
                <div class="flex justify-between items-start mb-1">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <span class="action-badge" :class="item.status">
                        {{ statusViMap[item.status] || item.status }}
                      </span>
                      <span class="item-title-link">{{ item.title }}</span>
                    </div>
                    <span class="item-subtitle">{{ item.subtitle }} • {{ item.type_label }}</span>
                  </div>
                  <div class="text-right">
                    <div v-if="item.amount" class="text-sm font-bold text-gray-700">{{ formatCurrency(item.amount) }}</div>
                    <div class="text-[10px] text-gray-400">{{ item.created_at }}</div>
                  </div>
                </div>

                <!-- Rejection Reason Highlight (Direct Visibility) -->
                <div v-if="item.rejected_reason" class="item-reason-alert">
                  <div class="reason-indicator"></div>
                  <span class="font-bold mr-1">Lý do:</span> {{ item.rejected_reason }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-4 bg-gray-50/50 border-t text-center">
            <a-button type="link" size="small" class="text-gray-400 font-medium hover:text-blue-500">
              Xem toàn bộ nhật ký hệ thống <ArrowRightOutlined />
            </a-button>
          </div>
        </div>
      </transition>
    </div>
  </a-spin>

  <!-- ─── Detail Drawer ─── -->
  <a-drawer
    :open="!!detailItem"
    :title="null"
    placement="right"
    :width="560"
    @close="detailItem = null"
    class="crm-drawer"
    :closable="false"
  >
    <template v-if="detailItem">
      <!-- 1. Custom Header -->
      <div class="px-6 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div class="flex items-center gap-4">
          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg', 
            typeColors[detailItem.type] ? `bg-${typeColors[detailItem.type]}-500 shadow-${typeColors[detailItem.type]}-100` : 'bg-blue-500 shadow-blue-100']"
            :style="{ backgroundColor: typeColors[detailItem.type] ? null : '#1B4F72' }">
            <SafetyCertificateOutlined v-if="detailItem.type === 'acceptance'" class="text-xl" />
            <AuditOutlined v-else-if="detailItem.type === 'cost'" class="text-xl" />
            <FileTextOutlined v-else class="text-xl" />
          </div>
          <div class="min-w-0">
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Yêu cầu duyệt: {{ detailItem.type_label }}</div>
            <div class="text-lg font-bold text-gray-800 truncate max-w-[340px]">{{ detailItem.title }}</div>
          </div>
        </div>
        <a-button type="text" class="flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" @click="detailItem = null">
          <CloseOutlined class="text-lg" />
        </a-button>
      </div>

      <div class="p-6 space-y-6 pb-32">
        <!-- 2. Main Context Information -->
        <div class="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-4">
          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Dự án</div>
              <div class="text-sm font-semibold text-gray-700 truncate" :title="detailItem.subtitle">{{ detailItem.subtitle }}</div>
            </div>
            <div v-if="detailItem.amount">
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Số tiền</div>
              <div class="text-base font-bold text-emerald-600">{{ formatCurrency(detailItem.amount) }}</div>
            </div>
            <div>
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Mức ưu tiên</div>
              <a-tag :color="{ low: 'default', medium: 'processing', high: 'warning', urgent: 'error' }[detailItem.priority]" class="rounded-full px-3 py-0 border-0 font-bold text-[10px]">
                {{ { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }[detailItem.priority] || detailItem.priority }}
              </a-tag>
            </div>
            <div>
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Ngày tạo</div>
              <div class="text-[11px] font-medium text-gray-500">{{ detailItem.created_at }}</div>
            </div>
          </div>

          <div v-if="detailItem.description" class="pt-4 border-t border-gray-100">
            <div class="text-[10px] text-gray-400 uppercase font-bold mb-2">Mô tả chi tiết</div>
            <div class="text-xs text-gray-600 leading-relaxed bg-white/80 p-3 rounded-xl border border-gray-50">{{ detailItem.description }}</div>
          </div>
        </div>

        <!-- 3. Approval Workflow Visualization -->
        <div v-if="detailItem.approval_status_info" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <NodeIndexOutlined class="text-blue-500" /> Tiến trình phê duyệt
          </div>
          <div class="space-y-6 ml-2">
            <div v-for="(step, idx) in detailItem.approval_status_info.history" :key="idx" class="flex gap-4 relative">
              <!-- Connector line -->
              <div v-if="idx < detailItem.approval_status_info.history.length - 1 || detailItem.approval_status_info.next" 
                   class="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-emerald-100"></div>
              
              <div class="z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white"
                   :class="step.status === 'rejected' ? 'bg-red-500' : 'bg-emerald-500'">
                <CheckOutlined v-if="step.status !== 'rejected'" class="text-[10px] text-white" />
                <CloseOutlined v-else class="text-[10px] text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <div class="text-xs font-bold" :class="step.status === 'rejected' ? 'text-red-600' : 'text-emerald-700'">{{ step.label }}</div>
                  <div class="text-[9px] text-gray-400 font-medium">{{ step.time }}</div>
                </div>
                <div class="text-[11px] text-gray-600">{{ step.user }}</div>
                <div v-if="step.note" class="mt-2 p-2.5 bg-red-50 rounded-xl border border-red-100 text-[11px] text-red-500 italic flex gap-2">
                  <CommentOutlined class="mt-0.5" /> <span>{{ step.note }}</span>
                </div>
              </div>
            </div>

            <!-- Next Step Indicator -->
            <div v-if="detailItem.approval_status_info.next" class="flex gap-4 relative">
              <div class="z-10 w-6 h-6 rounded-full bg-white border-2 border-dashed border-blue-400 flex items-center justify-center shrink-0">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
              </div>
              <div class="flex-1">
                <div class="text-xs font-bold text-blue-600 uppercase tracking-tight">{{ detailItem.approval_status_info.next.label }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[10px] text-gray-400">Vai trò:</span>
                  <span class="bg-blue-50 px-2 py-0.5 rounded-lg text-[10px] text-blue-600 font-bold border border-blue-100">{{ detailItem.approval_status_info.next.role }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Created By Profile -->
        <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div class="flex items-center gap-4">
             <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg border border-orange-200">
               {{ detailItem.created_by?.charAt(0)?.toUpperCase() }}
             </div>
             <div>
               <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Người đề xuất</div>
               <div class="text-sm font-bold text-gray-800">{{ detailItem.created_by }}</div>
               <div class="text-[10px] text-gray-400">{{ detailItem.created_by_email }}</div>
             </div>
           </div>
           <div v-if="detailItem.rejected_reason" class="max-w-[200px]">
             <a-alert type="error" :message="`Từ chối: ${detailItem.rejected_reason}`" banner class="text-[10px] py-1 px-3 rounded-xl border-red-100" />
           </div>
        </div>

        <!-- 5. Evidence & Comparison (FOR ACCEPTANCE & DEFECTS) -->
        <div v-if="detailItem.type === 'acceptance' || detailItem.type === 'defect'" class="space-y-4">
          <!-- BEFORE/AFTER Gallery -->
          <div v-if="(detailItem.before_images?.length || detailItem.after_images?.length)" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CameraOutlined class="text-blue-500" /> Minh chứng hình ảnh (Trước & Sau)
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Before Column -->
              <div class="space-y-2">
                <div class="text-[10px] font-bold text-gray-400 uppercase text-center bg-gray-50 py-1 rounded-md">Trước khi sửa / Hiện trạng</div>
                <div v-if="detailItem.before_images?.length" class="grid grid-cols-1 gap-2">
                  <a-image-preview-group>
                    <div v-for="img in detailItem.before_images" :key="img.id" class="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center">
                      <a-image :src="img.url" class="object-cover w-full h-full" />
                    </div>
                  </a-image-preview-group>
                </div>
                <div v-else class="h-20 flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                  <span class="text-[10px] text-gray-300 italic">Không có ảnh</span>
                </div>
              </div>

              <!-- After Column -->
              <div class="space-y-2">
                <div class="text-[10px] font-bold text-blue-500 uppercase text-center bg-blue-50 py-1 rounded-md">Sau khi sửa / Hoàn thiện</div>
                <div v-if="detailItem.after_images?.length" class="grid grid-cols-1 gap-2">
                  <a-image-preview-group>
                    <div v-for="img in detailItem.after_images" :key="img.id" class="relative group rounded-xl overflow-hidden border border-blue-100 bg-blue-50 aspect-video flex items-center justify-center">
                      <a-image :src="img.url" class="object-cover w-full h-full" />
                    </div>
                  </a-image-preview-group>
                </div>
                <div v-else class="h-20 flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                  <span class="text-[10px] text-gray-300 italic">Chưa có ảnh báo cáo</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Acceptance Defects List -->
          <div v-if="detailItem.type === 'acceptance' && detailItem.defects?.length" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <WarningOutlined class="text-orange-500" /> Danh sách lỗi & Khắc phục
            </div>
            <div class="space-y-3">
              <div v-for="defect in detailItem.defects" :key="defect.id" class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div class="flex items-start justify-between mb-2">
                  <div class="text-[11px] font-bold text-gray-700 flex-1">{{ defect.description }}</div>
                  <a-tag :color="defect.status === 'verified' ? 'success' : 'warning'" class="text-[9px] rounded-full border-0 font-bold m-0">
                    {{ defect.status === 'verified' ? 'Đã xác nhận' : 'Đang xử lý' }}
                  </a-tag>
                </div>
                <!-- Mini inline images for this specific defect -->
                <div v-if="defect.before_images?.length || defect.after_images?.length" class="flex gap-2">
                  <div v-if="defect.before_images?.[0]" class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                    <a-image :src="defect.before_images[0].url" class="object-cover h-full w-full" />
                  </div>
                  <div v-if="defect.after_images?.[0]" class="w-12 h-12 rounded-lg overflow-hidden border border-blue-200">
                    <a-image :src="defect.after_images[0].url" class="object-cover h-full w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5b. Maintenance Specific -->
        <div v-if="detailItem.type === 'maintenance'" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalendarOutlined class="text-indigo-500" /> Thông tin bảo trì
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Ngày bảo trì</div>
              <div class="text-sm font-semibold text-gray-700">{{ detailItem.maintenance_date }}</div>
            </div>
            <div v-if="detailItem.next_maintenance_date">
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Ngày bảo trì tiếp theo</div>
              <div class="text-sm font-semibold text-indigo-600">{{ detailItem.next_maintenance_date }}</div>
            </div>
          </div>
        </div>

        <!-- 5c. Warranty Specific -->
        <div v-if="detailItem.type === 'warranty'" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <SafetyCertificateOutlined class="text-emerald-500" /> Thông tin bảo hành & Bàn giao
          </div>
          <div class="grid grid-cols-1 gap-4">
            <div v-if="detailItem.handover_date">
              <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Ngày bàn giao</div>
              <div class="text-sm font-semibold text-gray-700">{{ detailItem.handover_date }}</div>
            </div>
          </div>
        </div>

        <!-- 6. Generic Attachments (Files/Documents) -->
        <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <PaperClipOutlined class="text-gray-400" /> Tài liệu & Đính kèm 
              <span v-if="detailItem.attachments_count" class="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{{ detailItem.attachments_count }}</span>
            </div>
          </div>
          
          <div v-if="detailItem.attachments?.length" class="grid grid-cols-1 gap-2">
            <div v-for="file in detailItem.attachments" :key="file.id" 
               class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-300 hover:bg-white transition-all group overflow-hidden">
               
               <!-- Preview Thumbnail for Images, Icon for others -->
               <div class="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-blue-50 transition-colors overflow-hidden">
                  <a-image v-if="file.is_image" :src="file.url" class="object-cover w-full h-full" />
                  <template v-else>
                    <FilePdfOutlined v-if="file.name.toLowerCase().endsWith('.pdf')" class="text-red-500 text-lg" />
                    <FileExcelOutlined v-else-if="file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)" class="text-emerald-600 text-lg" />
                    <FileOutlined v-else class="text-gray-400 text-lg" />
                  </template>
               </div>

               <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-gray-700 truncate group-hover:text-blue-600">{{ file.name }}</div>
                  <div class="flex items-center gap-2">
                    <div class="text-[10px] text-gray-400 uppercase font-medium">{{ file.size || 'N/A' }}</div>
                    <div v-if="file.description" class="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded font-bold uppercase">{{ file.description }}</div>
                  </div>
               </div>
               
               <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <a :href="file.url" target="_blank" class="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
                    <EyeOutlined />
                 </a>
                 <a :href="file.url" :download="file.name" class="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500">
                    <DownloadOutlined />
                 </a>
               </div>
            </div>
          </div>
          <div v-else class="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
             <div class="text-gray-300 italic text-xs">Không có tệp đính kèm</div>
          </div>
        </div>

      </div>

      <!-- Action Footer (Sticky) -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 transition-all rounded-br-2xl">
        <div class="flex gap-2">
           <a-button v-if="getDetailUrl(detailItem)" 
                     class="rounded-xl h-12 px-6 font-bold text-blue-600 bg-blue-50 border-blue-100" @click="navigateToDetail(detailItem)">
             <EyeOutlined /> Chi tiết module
           </a-button>
        </div>
        
        <div class="flex gap-3 min-w-[300px]">
           <a-button danger block size="large" class="rounded-xl h-12 font-bold shadow-sm" @click="openRejectModal(detailItem); detailItem = null;">
             <CloseOutlined /> Từ chối
           </a-button>
           <a-tooltip :title="detailItem.type === 'acceptance' && detailItem.metadata?.open_defects_count > 0 ? 'Vui lòng xác nhận hoàn thành tất cả các lỗi (Defects) liên quan trước khi phê duyệt giai đoạn này' : ''" class="w-full">
             <a-button type="primary" block size="large" class="rounded-xl h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 border-0" 
                       :disabled="detailItem.type === 'acceptance' && detailItem.metadata?.open_defects_count > 0"
                       @click="handleApproveByType(detailItem); detailItem = null;">
               <CheckOutlined /> Duyệt yêu cầu
             </a-button>
           </a-tooltip>
        </div>
      </div>
    </template>
  </a-drawer>


  <!-- ─── Reject Modal ─── -->
  <a-modal
    v-model:open="rejectModalVisible"
    title="Từ chối yêu cầu"
    @ok="handleReject"
    :confirm-loading="rejectLoading"
    ok-text="Xác nhận từ chối"
    cancel-text="Hủy"
    :ok-button-props="{ danger: true, disabled: !rejectReason.trim() }"
    centered
    class="crm-modal"
  >
    <div class="py-4">
      <div v-if="rejectTarget" class="mb-4 p-3 bg-gray-50 rounded-xl">
        <div class="font-semibold text-gray-700">{{ rejectTarget.title }}</div>
        <div class="text-sm text-gray-500">{{ rejectTarget.type_label }}</div>
        <div v-if="rejectTarget.amount" class="text-sm text-emerald-600 font-semibold">{{ formatCurrency(rejectTarget.amount) }}</div>
      </div>
      <a-form-item
        label="Lý do từ chối"
        :validate-status="!rejectReason.trim() ? 'error' : ''"
        help="Bắt buộc nhập lý do"
      >
        <a-textarea
          v-model:value="rejectReason"
          placeholder="Nhập lý do từ chối..."
          :rows="4"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </div>
  </a-modal>

  <!-- ─── Payment Report Modal (KH báo cáo thanh toán) ─── -->
  <a-modal
    v-model:open="showPaymentProofModal"
    title="Báo cáo thanh toán"
    :width="560"
    @ok="submitPaymentProof"
    :confirm-loading="paymentProofLoading"
    ok-text="Gửi báo cáo"
    cancel-text="Hủy"
    :ok-button-props="{ style: { background: '#10B981', borderColor: '#10B981' } }"
    centered
    destroy-on-close
    class="crm-modal"
  >
    <div class="mt-4 space-y-5">
      <div v-if="paymentProofTarget" class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-xl shadow-inner">
          <CreditCardOutlined />
        </div>
        <div class="flex-1">
          <div class="text-sm font-bold text-gray-800">{{ paymentProofTarget.title }}</div>
          <div class="text-xs text-gray-500 mt-0.5">{{ paymentProofTarget.subtitle }}</div>
          <div class="text-xs font-bold text-blue-600 mt-1">Số tiền thanh toán dự kiến: {{ formatCurrency(paymentProofTarget.amount) }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Ngày thanh toán <span class="text-red-500">*</span></label>
          <a-date-picker v-model:value="paymentProofForm.paid_date" class="w-full rounded-xl" size="large" format="DD/MM/YYYY" value-format="YYYY-MM-DD" placeholder="Chọn ngày" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Số tiền thực tế (Nếu khác)</label>
          <a-input-number v-model:value="paymentProofForm.actual_amount" class="w-full rounded-xl" size="large" placeholder="Nhập số tiền" :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="value => value.replace(/\$\s?|(,*)/g, '')" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Tệp đính kèm (Ảnh chứng từ/Bill) <span class="text-red-500">*</span></span>
          <span v-if="paymentProofFiles.length" class="text-emerald-600">Đã chọn {{ paymentProofFiles.length }} tệp</span>
        </label>
        <div 
          class="relative border-2 border-dashed border-gray-200 rounded-2xl p-8 transition-all hover:border-blue-400 hover:bg-blue-50/30 group cursor-pointer overflow-hidden"
          @click="$refs.proofFileInput.click()"
        >
          <input type="file" ref="proofFileInput" class="hidden" multiple @change="onPaymentProofFileChange" />
          <div class="text-center">
            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <CloudUploadOutlined class="text-2xl text-gray-400 group-hover:text-blue-500" />
            </div>
            <div class="text-sm font-semibold text-gray-600">Nhấn để tải tệp lên</div>
            <div class="text-xs text-gray-400 mt-1">Yêu cầu ảnh chụp bill chuyển khoản hoặc phiếu thu</div>
          </div>
          
          <div v-if="paymentProofFiles.length" class="mt-4 flex flex-wrap gap-2">
            <div v-for="(file, idx) in paymentProofFiles" :key="idx" class="px-3 py-1 bg-white border border-gray-100 rounded-lg text-xs flex items-center gap-2 shadow-sm animate-slide-up">
              <FileOutlined class="text-blue-500" />
              <span class="truncate max-w-[120px]">{{ file.name }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <div class="text-amber-500 mt-0.5"><InfoCircleOutlined /></div>
        <div class="text-[11px] text-amber-700 leading-relaxed italic">
          <strong>Lưu ý:</strong> Một khi bạn gửi báo cáo, thông tin sẽ được chuyển qua bộ phận Kế toán để đối soát và xác nhận nhận tiền thành công. Trạng thái đợt thanh toán sẽ chuyển sang "Đã báo cáo thanh toán".
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  HistoryOutlined,
  UpOutlined,
  DownOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  TeamOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  AppstoreOutlined,
  FilterOutlined,
  EyeOutlined,
  UserOutlined,
  CameraOutlined,
  WarningOutlined,
  NodeIndexOutlined,
  CommentOutlined,
  AuditOutlined,
  FileTextOutlined,
  CreditCardOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  roleGroups: { type: Object, default: () => ({}) },
  recentItems: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  auth: { type: Object, required: true },
  userPermissions: { type: Object, default: () => ({}) },
})

const currentUserRole = computed(() => props.auth.user.role)

// Unified mapping of role keys to permission flags
const rolePermissionMap = {
  management: 'can_management',
  accountant: 'can_accountant',
  project_manager: 'can_pm',
  supervisor: 'can_supervisor',
  customer: 'can_customer',
  hr: 'can_hr',
}

// ─── Role-based items mapping (Simplified from Backend) ───
const roleItemsMap = computed(() => ({
  management: props.roleGroups.management || [],
  accountant: props.roleGroups.accountant || [],
  customer: props.roleGroups.customer || [],
  project_manager: props.roleGroups.project_manager || [],
  supervisor: props.roleGroups.supervisor || [],
  hr: props.roleGroups.hr || [],
}))

// ─── Initial Tab Selection (Smart Logic) ───
const getInitialRole = () => {
  // If user has specific items waiting, pick the first one with items
  const rolesWithItems = Object.keys(roleItemsMap.value).filter(role => 
    props.userPermissions[rolePermissionMap[role]] && roleItemsMap.value[role].length > 0
  )
  if (rolesWithItems.length > 0) return rolesWithItems[0]

  // Otherwise pick first permitted role
  const permittedRoles = Object.keys(rolePermissionMap).filter(role => props.userPermissions[rolePermissionMap[role]])
  return permittedRoles[0] || 'management'
}

const activeRole = ref(getInitialRole())
const activeCategory = ref('all')
const activeStatus = ref('all')
const isRefreshing = ref(false)
const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const rejectLoading = ref(false)
const showHistory = ref(false)
const detailItem = ref(null)

const showPaymentProofModal = ref(false)
const paymentProofTarget = ref(null)
const paymentProofFiles = ref([])
const paymentProofForm = ref({ paid_date: new Date().toISOString().slice(0, 10), actual_amount: null })
const paymentProofLoading = ref(false)

const typeColors = {
  project_cost: 'blue',
  company_cost: 'gold',
  acceptance: 'purple',
  change_request: 'magenta',
  additional_cost: 'orange',
  sub_payment: 'cyan',
  contract: 'geekblue',
  project_payment: 'volcano',
  material_bill: 'purple',
  sub_acceptance: 'lime',
  supplier_acceptance: 'green',
  construction_log: 'geekblue',
  schedule_adjustment: 'red',
  defect: 'volcano',
  budget: 'blue',
  equipment_rental: 'cyan',
  asset_usage: 'blue',
  equipment_purchase: 'geekblue',
  equipment_inventory: 'green',
  attendance: 'teal',
  maintenance: 'orange',
  warranty: 'purple',
}

const statusViMap = {
  draft: 'Nháp', 
  pending: 'Chờ duyệt', 
  pending_approval: 'Chờ duyệt',
  submitted: 'Chờ duyệt',
  under_review: 'Đang xem xét',
  pending_management_approval: 'Chờ BĐH duyệt', 
  pending_accountant_approval: 'Chờ KT xác nhận',
  pending_accountant_confirmation: 'Chờ KT xác nhận', 
  pending_customer_approval: 'Chờ KH duyệt',
  customer_pending_approval: 'Chờ KH duyệt', 
  pending_management: 'Chờ BĐH duyệt',
  pending_accountant: 'Chờ KT xác nhận', 
  approved_management: 'BĐH đã duyệt',
  approved_accountant: 'KT đã duyệt', 
  approved: 'Đã duyệt',
  customer_approved: 'KH đã duyệt', 
  rejected: 'Từ chối',
  paid: 'Đã thanh toán', 
  customer_paid: 'KH báo TT',
  confirmed: 'Đã xác nhận', 
  implemented: 'Đã triển khai', 
  cancelled: 'Đã hủy',
  project_manager_approved: 'QLDA đã duyệt', 
  supervisor_approved: 'GS đã duyệt', 
  owner_approved: 'CĐT đã duyệt',
  fixed: 'Đã sửa — Chờ xác nhận', 
  verified: 'Đã xác nhận',
  pending_management: 'Chờ BĐH duyệt',
  pending_accountant: 'Chờ KT xác nhận',
  pending_return: 'Đang dùng — Chờ trả',
  in_use: 'Đang sử dụng',
  returned: 'Đã hoàn trả',
  pending_customer: 'Chờ duyệt',
}

const historyStatusColor = (status) => {
  if (['approved', 'customer_approved', 'approved_management', 'approved_accountant', 'paid', 'customer_paid', 'confirmed', 'implemented', 'verified'].includes(status)) return 'green'
  if (['rejected', 'cancelled'].includes(status)) return 'red'
  if (['draft'].includes(status)) return 'default'
  if (['submitted', 'under_review', 'fixed'].includes(status)) return 'processing'
  return 'orange'
}


// Sort and Filter active items
const activeItems = computed(() => {
  let items = roleItemsMap.value[activeRole.value] || []
  
  // Filter by category
  if (activeCategory.value !== 'all') {
    items = items.filter(i => {
      if (activeCategory.value === 'finance') return ['project_cost', 'sub_payment', 'project_payment', 'material_bill', 'budget', 'equipment_rental', 'equipment_inventory'].includes(i.type)
      if (activeCategory.value === 'acceptance') return ['acceptance', 'sub_acceptance', 'supplier_acceptance', 'warranty'].includes(i.type)
      if (activeCategory.value === 'technical') return ['change_request', 'additional_cost', 'schedule_adjustment', 'defect', 'asset_usage', 'maintenance'].includes(i.type)
      if (activeCategory.value === 'hr') return ['attendance'].includes(i.type)
      return true
    })
  }

  // Filter by status
  if (activeStatus.value !== 'all') {
    items = items.filter(i => {
      if (activeStatus.value === 'pending') return ['pending', 'pending_management_approval', 'pending_accountant_approval', 'pending_management', 'pending_accountant', 'pending_return', 'submitted', 'under_review', 'project_manager_approved', 'supervisor_approved', 'fixed', 'customer_paid', 'customer_pending_approval', 'overdue', 'pending_customer'].includes(i.status)
      if (activeStatus.value === 'draft') return i.status === 'draft'
      if (activeStatus.value === 'rejected') return i.status === 'rejected'
      if (activeStatus.value === 'approved') return ['approved', 'confirmed', 'paid', 'customer_approved', 'in_use', 'returned'].includes(i.status)
      return true
    })
  }

  return [...items].sort((a, b) => {
    const dateA = a.created_at || ''
    const dateB = b.created_at || ''
    const pa = dateA.split(/[\/ :]/).reverse().join('')
    const pb = dateB.split(/[\/ :]/).reverse().join('')
    return pb.localeCompare(pa)
  })
})

const totalPending = computed(() =>
  Object.values(roleItemsMap.value).reduce((sum, arr) => sum + arr.length, 0)
)

// ─── Role tabs (UX Optimized per permissions) ───
const roleTabs = computed(() => {
  const allTabs = [
    { key: 'management', label: 'BĐH', icon: BankOutlined, count: roleItemsMap.value.management.length },
    { key: 'accountant', label: 'Kế Toán', icon: DollarOutlined, count: roleItemsMap.value.accountant.length },
    { key: 'project_manager', label: 'QLDA (PM)', icon: ToolOutlined, count: roleItemsMap.value.project_manager.length },
    { key: 'supervisor', label: 'Giám Sát', icon: SafetyCertificateOutlined, count: roleItemsMap.value.supervisor.length },
    { key: 'customer', label: 'Khách Hàng', icon: TeamOutlined, count: roleItemsMap.value.customer.length },
    { key: 'hr', label: 'Nhân Sự', icon: UserOutlined, count: roleItemsMap.value.hr.length },
  ]
  
  // Only show tabs where the user has explicit permission
  return allTabs.filter(tab => {
    const permissionKey = rolePermissionMap[tab.key]
    return props.userPermissions[permissionKey]
  })
})

// ─── Table columns ───
const tableColumns = [
  { title: 'Trạng thái', key: 'status', width: 110 },
  { title: 'Loại', key: 'type', width: 140 },
  { title: 'Nội dung', key: 'title', ellipsis: true },
  { title: 'Số tiền', key: 'amount', width: 120, align: 'right' },
  { title: 'Người tạo', key: 'created_by', width: 160 },
  { title: 'Ngày tạo', key: 'created_at', width: 120 },
  { title: 'Thao tác', key: 'actions', width: 200, align: 'center', fixed: 'right' },
]

const historyColumns = [
  { title: 'Yêu cầu', key: 'title', width: 250 },
  { title: 'Loại', key: 'type', width: 100 },
  { title: 'Số tiền', key: 'amount', width: 140, align: 'right' },
  { title: 'Kết quả', key: 'status', width: 120 },
  { title: 'Ngày tạo', key: 'created_at', width: 140 },
]

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)

const formatCompact = (amount) => {
  if (!amount) return '0'
  if (amount >= 1e9) return (amount / 1e9).toFixed(1) + ' tỷ'
  if (amount >= 1e6) return (amount / 1e6).toFixed(1) + ' tr'
  if (amount >= 1e3) return (amount / 1e3).toFixed(0) + 'k'
  return new Intl.NumberFormat('vi-VN').format(amount)
}

const refreshPage = () => {
  isRefreshing.value = true
  router.reload({
    onFinish: () => {
      isRefreshing.value = false
      message.success('Đã cập nhật dữ liệu mới nhất')
    }
  })
}

const openDetailDrawer = (record) => { detailItem.value = record }

// ─── Detail page URL mapping ───
const getDetailUrl = (record) => {
  if (!record) return null
  const pid = record.project_id
  const typeUrlMap = {
    project_cost: pid ? `/projects/${pid}?tab=costs` : null,
    company_cost: null, // company costs have no project tab
    acceptance: pid ? `/projects/${pid}?tab=acceptance&id=${record.id}` : null,
    change_request: pid ? `/projects/${pid}?tab=change_requests` : null,
    additional_cost: pid ? `/projects/${pid}?tab=additional_costs` : null,
    sub_payment: pid ? `/projects/${pid}?tab=subcontractors` : null,
    contract: pid ? `/projects/${pid}?tab=contract` : null,
    project_payment: pid ? `/projects/${pid}?tab=payments` : null,
    material_bill: pid ? `/projects/${pid}?tab=materials` : null,
    sub_acceptance: pid ? `/projects/${pid}?tab=subcontractors` : null,
    supplier_acceptance: pid ? `/projects/${pid}?tab=subcontractors` : null,
    construction_log: pid ? `/projects/${pid}?tab=logs` : null,
    schedule_adjustment: pid ? `/projects/${pid}?tab=logs` : null, // Logs often contain schedule adjustments
    defect: pid ? `/projects/${pid}?tab=defects` : null,
    defect_verify: pid ? `/projects/${pid}?tab=defects` : null,
    budget: pid ? `/projects/${pid}?tab=budgets` : null,
    equipment_rental: pid ? `/projects/${pid}?tab=equipment` : null,
    equipment_rental_return: pid ? `/projects/${pid}?tab=equipment` : null,
    asset_usage: pid ? `/projects/${pid}?tab=equipment` : null,
    asset_usage_return: pid ? `/projects/${pid}?tab=equipment` : null,
    equipment_purchase: null, // Global equipment purchase
    equipment_inventory: '/equipment', // Kho thiết bị
    attendance: pid ? `/projects/${pid}?tab=attendance` : `/hr/attendance`,
    maintenance: pid ? `/projects/${pid}?tab=technical` : null,
    warranty: pid ? `/projects/${pid}?tab=acceptance` : null,
  }
  return typeUrlMap[record.type] || typeUrlMap[record._approveType] || null
}

const navigateToDetail = (record) => {
  const url = getDetailUrl(record)
  if (url) {
    detailItem.value = null
    router.visit(url)
  }
}

// ─── Unified approve by type ───
const approveUrlMap = {
  management: (r) => `/approvals/${r.id}/approve-management`,
  accountant: (r) => `/approvals/${r.id}/approve-accountant`,
  acceptance: (r) => `/approvals/acceptance/${r.id}/approve`,
  acceptance_supervisor: (r) => `/approvals/acceptance-supervisor/${r.id}/approve`,
  acceptance_pm: (r) => `/approvals/acceptance-pm/${r.id}/approve`,
  change_request: (r) => `/approvals/change-request/${r.id}/approve`,
  additional_cost: (r) => `/approvals/additional-cost/${r.id}/approve`,
  sub_payment: (r) => `/approvals/sub-payment/${r.id}/approve`,
  sub_payment_confirm: (r) => `/approvals/sub-payment/${r.id}/confirm`,
  contract: (r) => `/approvals/contract/${r.id}/approve`,
  project_payment: (r) => `/approvals/payment/${r.id}/approve`,
  project_payment_confirm: (r) => `/approvals/payment/${r.id}/confirm`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/approve`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/approve`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/approve`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/approve`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/approve`,
  defect_verify: (r) => `/approvals/defect/${r.id}/verify`,
  budget: (r) => `/approvals/budget/${r.id}/approve`,
  equipment_rental_management: (r) => `/projects/${r.project_id}/equipment-rentals/${r.id}/approve-management`,
  equipment_rental_accountant: (r) => `/projects/${r.project_id}/equipment-rentals/${r.id}/confirm-accountant`,
  equipment_rental_return: (r) => `/projects/${r.project_id}/equipment-rentals/${r.id}/confirm-return`,
  asset_usage_management: (r) => `/projects/${r.project_id}/asset-usages/${r.id}/approve-management`,
  asset_usage_accountant: (r) => `/projects/${r.project_id}/asset-usages/${r.id}/confirm-accountant`,
  asset_usage_return: (r) => `/projects/${r.project_id}/asset-usages/${r.id}/confirm-return`,
  equipment_purchase_management: (r) => `/approvals/equipment-purchase/${r.id}/approve-management`,
  equipment_purchase_accountant: (r) => `/approvals/equipment-purchase/${r.id}/confirm-accountant`,
  equipment_inventory_management: (r) => `/equipment/${r.id}/approve-management`,
  equipment_inventory_accountant: (r) => `/equipment/${r.id}/confirm-accountant`,
  attendance: (r) => `/approvals/attendance/${r.id}/approve`,
  maintenance: (r) => `/approvals/maintenance/${r.id}/approve`,
  warranty: (r) => `/approvals/warranty/${r.id}/approve`,
}

const openPaymentProofModal = (record) => {
  paymentProofTarget.value = record
  paymentProofFiles.value = []
  paymentProofForm.value = { 
    paid_date: new Date().toISOString().slice(0, 10), 
    actual_amount: record.amount || null 
  }
  showPaymentProofModal.value = true
}

const onPaymentProofFileChange = (e) => {
  paymentProofFiles.value = Array.from(e.target.files || [])
}

const submitPaymentProof = () => {
  if (!paymentProofFiles.value.length || !paymentProofTarget.value) {
    message.warning('Vui lòng chọn ít nhất một tệp chứng từ')
    return
  }
  
  paymentProofLoading.value = true
  const record = paymentProofTarget.value
  const formData = new FormData()
  paymentProofFiles.value.forEach(f => formData.append('files[]', f))
  if (paymentProofForm.value.paid_date) formData.append('paid_date', paymentProofForm.value.paid_date)
  if (paymentProofForm.value.actual_amount) formData.append('actual_amount', paymentProofForm.value.actual_amount)
  
  router.post(`/projects/${record.project_id}/payments/${record.id}/mark-paid`, formData, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      message.success('Báo cáo thanh toán thành công. Đã gửi cho Kế toán xác nhận.')
      showPaymentProofModal.value = false
      paymentProofFiles.value = []; paymentProofTarget.value = null; paymentProofLoading.value = false
    },
    onError: (errors) => {
      message.error(Object.values(errors).flat()[0] || 'Lỗi khi gửi báo cáo')
      paymentProofLoading.value = false
    }
  })
}

const approveLabels = {
  management: 'BĐH duyệt',
  accountant: 'Kế Toán xác nhận',
  acceptance: 'Duyệt nghiệm thu (KH)',
  acceptance_supervisor: 'GS duyệt nghiệm thu',
  acceptance_pm: 'QLDA duyệt nghiệm thu',
  change_request: 'Duyệt yêu cầu thay đổi',
  additional_cost: 'Duyệt chi phí phát sinh',
  sub_payment: 'BĐH duyệt thanh toán NTP',
  sub_payment_confirm: 'KT xác nhận thanh toán NTP',
  contract: 'Duyệt hợp đồng',
  project_payment: 'Duyệt thanh toán',
  project_payment_confirm: 'KT xác nhận thanh toán DA',
  material_bill: 'Duyệt phiếu vật tư',
  sub_acceptance: 'Duyệt nghiệm thu NTP',
  supplier_acceptance: 'Duyệt nghiệm thu NCC',
  construction_log: 'Duyệt nhật ký công trường',
  schedule_adjustment: 'Duyệt điều chỉnh tiến độ',
  defect_verify: 'Xác nhận lỗi đã sửa',
  budget: 'Duyệt ngân sách dự án',
  equipment_rental_management: 'BĐH duyệt thuê thiết bị',
  equipment_rental_accountant: 'KT xác nhận thuê thiết bị',
  equipment_rental_return: 'Xác nhận trả thiết bị thuê',
  asset_usage_management: 'BĐH duyệt sử dụng thiết bị',
  asset_usage_accountant: 'KT xác nhận sử dụng thiết bị',
  asset_usage_return: 'Xác nhận trả thiết bị kho',
  equipment_purchase_management: 'BĐH duyệt mua thiết bị',
  equipment_purchase_accountant: 'KT duyệt thanh toán mua thiết bị',
  equipment_inventory_management: 'BĐH duyệt nhập kho thiết bị',
  equipment_inventory_accountant: 'KT xác nhận chi & nhập kho',
  attendance: 'Duyệt chấm công',
  maintenance: 'Duyệt bảo trì',
  warranty: 'Duyệt bảo hành',
}

const handleApproveByType = (record) => {
  const type = record._approveType || record.approval_level || 'management'
  const label = approveLabels[type] || 'Duyệt'
  const urlFn = approveUrlMap[type]
  if (!urlFn) return

  // Customer reporting payment MUST upload proof
  if (type === 'project_payment' && activeRole.value === 'customer') {
    openPaymentProofModal(record)
    return
  }

  // Enforce mandatory attachments for Accountant level on financial items (skip for HR items and labor costs from attendance)
  if (type !== 'attendance' && record.category !== 'labor' && activeRole.value === 'accountant' && (record.attachments_count === 0 || !record.attachments_count)) {
    Modal.warning({
      title: 'Thiếu chứng từ đính kèm',
      content: 'Cảnh báo: Yêu cầu tài chính này chưa có tệp chứng từ đính kèm. Kế toán bắt buộc phải kiểm tra chứng từ trước khi xác nhận để đảm bảo tính chính xác của dòng tiền.',
      okText: 'Tôi đã hiểu',
      centered: true
    })
    return
  }

  Modal.confirm({
    title: label,
    content: `Duyệt "${record.title}"?${record.amount ? `\n\nSố tiền: ${formatCurrency(record.amount)}` : ''}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#10B981', borderColor: '#10B981' } },
    onOk() {
      router.post(urlFn(record), {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt "${record.title}"`),
        onError: (errors) => message.error(Object.values(errors).flat()[0] || 'Không thể duyệt yêu cầu này'),
      })
    },
  })
}

// ─── Unified reject ───
const rejectUrlMap = {
  management: (r) => `/approvals/${r.id}/reject`,
  accountant: (r) => `/approvals/${r.id}/reject`,
  acceptance: (r) => `/approvals/acceptance/${r.id}/reject`,
  acceptance_supervisor: (r) => `/approvals/acceptance-supervisor/${r.id}/reject`,
  acceptance_pm: (r) => `/approvals/acceptance-pm/${r.id}/reject`,
  change_request: (r) => `/approvals/change-request/${r.id}/reject`,
  additional_cost: (r) => `/approvals/additional-cost/${r.id}/reject`,
  sub_payment: (r) => `/approvals/sub-payment/${r.id}/reject`,
  sub_payment_confirm: (r) => `/approvals/sub-payment/${r.id}/reject`,
  contract: (r) => `/approvals/contract/${r.id}/reject`,
  project_payment: (r) => `/approvals/payment/${r.id}/reject`,
  project_payment_confirm: (r) => `/approvals/payment/${r.id}/reject`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/reject`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/reject`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/reject`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/reject`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/reject`,
  defect_verify: (r) => `/approvals/defect/${r.id}/reject`,
  budget: (r) => `/approvals/budget/${r.id}/reject`,
  equipment_rental_management: (r) => `/projects/${r.project_id}/equipment-rentals/${r.id}/reject`,
  equipment_rental_accountant: (r) => `/projects/${r.project_id}/equipment-rentals/${r.id}/reject`,
  asset_usage_management: (r) => `/projects/${r.project_id}/asset-usages/${r.id}/reject`,
  asset_usage_accountant: (r) => `/projects/${r.project_id}/asset-usages/${r.id}/reject`,
  equipment_purchase_management: (r) => `/approvals/equipment-purchase/${r.id}/reject`,
  equipment_purchase_accountant: (r) => `/approvals/equipment-purchase/${r.id}/reject`,
  equipment_inventory_management: (r) => `/equipment/${r.id}/reject`,
  equipment_inventory_accountant: (r) => `/equipment/${r.id}/reject`,
  attendance: (r) => `/approvals/attendance/${r.id}/reject`,
  maintenance: (r) => `/approvals/maintenance/${r.id}/reject`,
  warranty: (r) => `/approvals/warranty/${r.id}/reject`,
}

const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const handleReject = () => {
  if (!rejectReason.value.trim() || !rejectTarget.value) return
  rejectLoading.value = true

  const type = rejectTarget.value._approveType || 'management'
  const urlFn = rejectUrlMap[type]
  if (!urlFn) { rejectLoading.value = false; return }

  router.post(urlFn(rejectTarget.value), {
    reason: rejectReason.value.trim(),
  }, {
    preserveScroll: true,
    onSuccess: () => {
      message.success(`Đã từ chối "${rejectTarget.value.title}"`)
      rejectModalVisible.value = false
      rejectTarget.value = null
      rejectLoading.value = false
    },
    onError: () => {
      message.error('Không thể từ chối yêu cầu này')
      rejectLoading.value = false
    },
  })
}
</script>

<style scoped>
/* ─── Unified Control Bar ─── */
.ac-controls {
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-controls__main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ac-controls__filters {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 10px;
  background: #F8FAFC;
  border-radius: 14px;
  border: 1px solid #F1F5F9;
}
.role-selector :deep(.ant-radio-button-wrapper) {
  border-radius: 14px !important;
  border: 1px solid #E2E8F0 !important;
  margin-right: 12px;
  height: 52px;
  line-height: 50px;
  font-weight: 700;
  color: #64748B;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  position: relative;
  overflow: visible;
}
.role-selector :deep(.ant-radio-button-wrapper-checked) {
  background: #EFF6FF !important; /* Soft blue background */
  border-color: #2563EB !important; /* Strong blue border */
  color: #1D4ED8 !important; /* Blue text */
  box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.2);
  transform: translateY(-2px);
}
/* Indicator Dot for Active Role */
.role-selector :deep(.ant-radio-button-wrapper-checked)::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: #3B82F6;
  border-radius: 50%;
  box-shadow: 0 0 10px #3B82F6;
}

.role-selector :deep(.ant-radio-button-wrapper::before) {
  display: none !important;
}

.tab-badge {
  background: #F59E0B;
  color: white;
  font-size: 10px;
  padding: 0 7px;
  height: 20px;
  line-height: 20px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  margin-left: 6px;
  font-weight: 800;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}
.role-selector :deep(.ant-radio-button-wrapper-checked) .tab-badge {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
/* Highlight active Segmented items */
.filter-group :deep(.ant-segmented) {
  background: #F1F5F9;
  padding: 3px;
  border-radius: 10px;
}
.filter-group :deep(.ant-segmented-item-selected) {
  background: #1E293B !important; /* Dark slate for premium feel */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 8px !important;
}
.filter-group :deep(.ant-segmented-item-selected .ant-segmented-item-label) {
  color: white !important;
  font-weight: 800;
}
.filter-group :deep(.ant-segmented-item-label) {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
}
.filter-label {
  font-size: 11px;
  font-weight: 800;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ─── Stats Grid ─── */
.ac-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.ac-stat-card {
  background: white;
  border-radius: 18px;
  border: 1px solid #E8ECF1;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}
.ac-stat-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
  border-color: #CBD5E1;
}
.ac-stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: white;
}
.ac-stat-card__value {
  font-size: 26px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1.1;
}
.ac-stat-card__value--amount {
  color: #6366F1;
  font-size: 20px;
}
.ac-stat-card__label {
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
  margin-top: 2px;
}

/* ─── Table Card ─── */
.ac-table-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.ac-table :deep(.ant-table-thead > tr > th) {
  background: #F8FAFC;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 14px 16px;
}
.ac-table :deep(.ant-table-tbody > tr > td) {
  background: #FAFBFC;
}
.ac-table :deep(.ant-table-pagination) {
  padding: 12px 16px;
}

/* ─── Item title clickable ─── */
.ac-item-title {
  cursor: pointer;
  transition: color 0.15s ease;
}
.ac-item-title:hover .ac-item-title__main {
  color: #3B82F6;
}
.ac-item-title__main {
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
  line-height: 1.4;
  transition: color 0.15s ease;
}
.ac-item-title__sub {
  font-size: 11px;
  color: #9CA3AF;
  line-height: 1.3;
  margin-top: 1px;
}

/* ─── Action Buttons ─── */
.ac-btn-approve {
  background: #10B981 !important;
  border-color: #10B981 !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 12px !important;
}
.ac-btn-approve:hover {
  background: #059669 !important;
  border-color: #059669 !important;
}
.ac-btn-reject {
  border-radius: 8px;
}
.ac-btn-detail {
  border-radius: 8px !important;
  border-color: #93C5FD !important;
  color: #1B4F72 !important;
  background: #EFF6FF !important;
}
.ac-btn-detail:hover {
  background: #DBEAFE !important;
  border-color: #60A5FA !important;
  color: #1E40AF !important;
}

/* ─── History Activity Feed ─── */
.ac-history-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
}
.ac-history-card__header {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: #F8FAFC;
  transition: all 0.2s ease;
}
.ac-history-card__header:hover {
  background: #F1F5F9;
}
.history-pulse {
  width: 8px;
  height: 8px;
  background: #3B82F6;
  border-radius: 50%;
  box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
.history-count {
  background: #CBD5E1;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
}

.ac-history-body {
  border-top: 1px solid #F1F5F9;
}

/* Timeline Layout */
.ac-timeline {
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.ac-timeline-item {
  display: flex;
  gap: 20px;
  position: relative;
}
.ac-timeline-item:last-child .ac-timeline-line {
  display: none;
}

.ac-timeline-left {
  width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ac-timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #94A3B8;
  z-index: 1;
}
.ac-timeline-dot.approved, .ac-timeline-dot.confirmed, .ac-timeline-dot.paid, .ac-timeline-dot.verified {
  background: #DCFCE7;
  color: #16A34A;
}
.ac-timeline-dot.rejected, .ac-timeline-dot.cancelled {
  background: #FEE2E2;
  color: #DC2626;
}

.ac-timeline-line {
  flex-grow: 1;
  width: 2px;
  background: #F1F5F9;
  margin: 4px 0;
}

.ac-timeline-content {
  flex-grow: 1;
  padding-bottom: 24px;
  cursor: pointer;
}
.item-title-link {
  font-weight: 600;
  color: #1E293B;
  font-size: 13.5px;
  transition: color 0.15s ease;
}
.ac-timeline-content:hover .item-title-link {
  color: #2563EB;
}
.item-subtitle {
  font-size: 11px;
  color: #64748B;
}

.action-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: #F1F5F9;
  color: #64748B;
}
.action-badge.approved, .action-badge.confirmed, .action-badge.paid, .action-badge.verified {
  background: #BBF7D0;
  color: #15803D;
}
.action-badge.rejected, .action-badge.cancelled {
  background: #FECACA;
  color: #B91C1C;
}

.item-reason-alert {
  margin-top: 8px;
  padding: 8px 12px;
  background: #FFF1F2;
  border-left: 3px solid #F43F5E;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  color: #9F1239;
  display: flex;
  align-items: center;
}

/* Animations */
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* ─── Detail Drawer ─── */
.detail-section {
  margin-bottom: 18px;
}
.detail-label {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

/* ─── Responsive ─── */
@media (max-width: 1200px) {
  .ac-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .ac-stats-grid {
    grid-template-columns: 1fr;
  }
  .ac-role-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  .ac-role-tab {
    padding: 8px 14px;
    font-size: 12px;
    white-space: nowrap;
    flex: unset;
  }
}
</style>
