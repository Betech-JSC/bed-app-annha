<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogService
{
    /**
     * Map of model class names to human readable Vietnamese entity names
     */
    public static array $modelLabels = [
        'App\Models\Cost' => 'Chi phí dự án',
        'App\Models\MaterialBill' => 'Phiếu vật tư',
        'App\Models\MaterialBillItem' => 'Chi tiết vật tư',
        'App\Models\EquipmentRental' => 'Thuê máy / Thiết bị',
        'App\Models\Equipment' => 'Máy & Thiết bị',
        'App\Models\SubcontractorPayment' => 'Thanh toán thầu phụ',
        'App\Models\Subcontractor' => 'Nhà thầu phụ',
        'App\Models\SubcontractorContract' => 'Hợp đồng thầu phụ',
        'App\Models\Contract' => 'Hợp đồng chính',
        'App\Models\AdditionalCost' => 'Chi phí phát sinh',
        'App\Models\Project' => 'Dự án',
        'App\Models\ProjectPayment' => 'Thanh toán dự án',
        'App\Models\ProjectBudget' => 'Ngân sách dự án',
        'App\Models\Approval' => 'Yêu cầu phê duyệt',
        'App\Models\User' => 'Người dùng',
    ];

    /**
     * Map action to Vietnamese label
     */
    public static array $actionLabels = [
        'created' => 'Thêm mới',
        'updated' => 'Cập nhật',
        'deleted' => 'Đã xóa (Soft Delete)',
        'restored' => 'Khôi phục',
        'approved' => 'Phê duyệt',
        'rejected' => 'Từ chối',
        'force_deleted' => 'Xóa vĩnh viễn',
    ];

    /**
     * Log an activity explicitly or via trait
     */
    public static function log(
        string $action,
        $subject,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null,
        string $logType = 'audit',
        ?int $projectId = null
    ): ?ActivityLog {
        try {
            $user = Auth::user();

            $subjectType = is_object($subject) ? get_class($subject) : (string) $subject;
            $subjectId = is_object($subject) ? ($subject->id ?? null) : null;

            // Rút trích mã bản ghi (code/number/name/title)
            $subjectCode = null;
            if (is_object($subject)) {
                $subjectCode = $subject->code 
                    ?? $subject->number 
                    ?? $subject->cost_code 
                    ?? $subject->bill_number 
                    ?? $subject->contract_number 
                    ?? $subject->payment_number 
                    ?? $subject->name 
                    ?? $subject->title 
                    ?? ($subjectId ? "#{$subjectId}" : null);

                if (!$projectId && isset($subject->project_id)) {
                    $projectId = $subject->project_id;
                }
            }

            // Tự động sinh mô tả nếu chưa truyền
            if (!$description) {
                $entityName = self::$modelLabels[$subjectType] ?? class_basename($subjectType);
                $actionName = self::$actionLabels[$action] ?? $action;
                $codeStr = $subjectCode ? " (Mã: {$subjectCode})" : "";
                $userName = $user ? ($user->name ?? $user->email) : 'Hệ thống';
                $description = "{$userName} đã {$actionName} {$entityName}{$codeStr}";
            }

            return ActivityLog::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'System',
                'user_email' => $user?->email,
                'user_role' => $user?->role ?? $user?->user_type,
                'log_type' => $logType,
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'subject_code' => $subjectCode,
                'project_id' => $projectId,
                'description' => $description,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'url' => Request::fullUrl(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ActivityLog creation failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get paginated logs with filters
     */
    public function getFilteredLogs(array $filters, int $perPage = 20)
    {
        $query = ActivityLog::with(['user:id,name,email', 'project:id,name,code'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('subject_code', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['subject_type'])) {
            $query->where('subject_type', $filters['subject_type']);
        }

        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage)->withQueryString();
    }
}
