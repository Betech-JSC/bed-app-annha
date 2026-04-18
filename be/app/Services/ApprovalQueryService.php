<?php

namespace App\Services;

use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use App\Models\SubcontractorPayment;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Models\ConstructionLog;
use App\Models\ScheduleAdjustment;
use App\Models\Defect;
use App\Models\ProjectBudget;
use App\Models\EquipmentRental;
use App\Models\AssetUsage;
use App\Models\MaterialBill;
use App\Models\Attendance;
use App\Models\User;
use App\Models\Approval;
use App\Constants\Permissions;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * ApprovalQueryService — Single source of truth for Approval Center data.
 *
 * Both CrmApprovalController (Web/Inertia) and ApprovalCenterController (Mobile API)
 * use this service to ensure queries are always consistent and synchronized.
 *
 * IMPORTANT: All Cost queries automatically exclude linked costs
 * (material_bill_id / subcontractor_payment_id) to prevent duplication,
 * since MaterialBills and SubcontractorPayments have their own dedicated sections.
 */
class ApprovalQueryService
{
    /**
     * Get the full formatted dashboard data for mobile applications.
     * This combines raw data fetching with transformation/formatting.
     */
    public function getMobileDashboardData($user, string $type = 'all'): array
    {
        // 1. Determine user's approval capabilities for 'can_approve' flags
        $canApproveManagement = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_MANAGEMENT) || $user->isSuperAdmin();
        $canApproveAccountant = $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_ACCOUNTANT) || $user->isSuperAdmin();

        // 2. Fetch raw data from the same source used by Web
        // Always fetch ALL for dashboard so we can calculate counts for all tabs
        $data = $this->getApprovalData($user, 'all');
        
        $result = [
            'summary' => [],
            'items' => [],
            'recent_items' => [],
            'stats' => [],
            'grand_total' => 0,
        ];

        // 3. Build ALL Items Array once
        $allItems = $this->buildMobileItems($user, $data, 'all', $canApproveManagement, $canApproveAccountant);

        // 4. Build Summary from the already processed list
        $result['summary'] = $this->buildMobileSummaryFromProcessedItems($user, $allItems);

        // 5. Filter for the requested type
        if ($type === 'all' || in_array($type, ['management', 'accountant', 'project_manager', 'supervisor', 'customer', 'hr'])) {
            $result['items'] = ($type === 'all')
                ? $allItems
                : array_values(array_filter($allItems, fn($i) => ($i['role_group'] ?? '') === $type));
        } else {
            // Specific type filter (e.g. project_cost)
            $result['items'] = array_values(array_filter($allItems, fn($i) => ($i['type'] ?? '') === $type));
        }

        // 6. Build Recent Activity
        $result['recent_items'] = $this->buildRecentMobileItems($user, $data);

        // 7. Stats Overview (from filtered items)
        $result['stats'] = array_merge(
            $this->getStats($user, isset($data['projectIds']) ? false : true, $data['projectIds'] ?? [], $data),
            [
                'pending_total' => count($result['items']),
                'pending_amount' => (float) array_sum(array_column($result['items'], 'amount')),
            ]
        );

        // 8. Inject Role Info for UI elements (icons/labels) - already sorted by building order mostly, but we re-sort by date
        usort($result['items'], fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
        
        foreach ($result['items'] as &$item) {
            $item = array_merge($item, $this->getRequiredRoleInfo($item['approval_level'] ?? 'management'));
        }
        foreach ($result['recent_items'] as &$item) {
            $item = array_merge($item, $this->getRequiredRoleInfo($item['approval_level'] ?? 'history'));
        }
        unset($item);

        $result['grand_total'] = $result['stats']['pending_total'];
        $result['user_roles'] = $user->roles->pluck('name')->toArray();

        // 9. Budget Items — for accountant to link costs to project budgets
        $result['budget_items_by_project'] = $this->getBudgetItemsForContext($user, $result['items'], $canApproveAccountant);

        return $result;
    }

    /**
     * Map Cost model to Mobile API item format
     */
    private function mapCostToItem($cost, $type, $canApproveManagement, $canApproveAccountant)
    {
        return [
            'id' => $cost->id,
            'type' => $type,
            'title' => $cost->name,
            'subtitle' => $cost->costGroup->name ?? ($cost->project->name ?? 'Không phân nhóm'),
            'amount' => (float) $cost->amount,
            'status' => $cost->status,
            'status_label' => $this->getStatusLabel($cost->status),
            'created_by' => $cost->creator->name ?? 'N/A',
            'created_at' => $cost->created_at->toISOString(),
            'project_id' => $cost->project_id,
            'route' => $cost->project_id ? "/projects/{$cost->project_id}/costs" : "/finance/costs",
            'can_approve' => str_contains($cost->status, 'management') ? $canApproveManagement : $canApproveAccountant,
            'approval_level' => str_contains($cost->status, 'management') ? 'management' : 'accountant',
            'attachments' => $this->formatAttachments($cost),
            'attachments_count' => $cost->attachments->count(),
            'description' => $cost->description,
        ];
    }

    /**
     * Format attachments for mobile consumption
     */
    private function formatAttachments($model): array
    {
        if (!$model || !method_exists($model, 'attachments') || !$model->attachments) {
            return [];
        }

        return $model->attachments->map(fn($a) => [
            'id' => $a->id,
            'name' => $a->original_name ?? $a->file_name,
            'url' => str_starts_with($a->file_url, 'http') ? $a->file_url : asset($a->file_url),
            'size' => $a->file_size_formatted ?? '',
            'type' => $a->mime_type ?? 'application/octet-stream',
            'tag' => $a->description, // 'before' or 'after'
        ])->toArray();
    }

    private function formatAttachmentsByTag($model, string $tag): array
    {
        if (!$model || !method_exists($model, 'attachments') || !$model->attachments) {
            return [];
        }

        return $model->attachments
            ->filter(fn($a) => $a->description === $tag || ($tag === 'before' && empty($a->description)))
            ->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->original_name ?? $a->file_name,
                'url' => str_starts_with($a->file_url, 'http') ? $a->file_url : asset($a->file_url),
                'size' => $a->file_size_formatted ?? '',
                'type' => $a->mime_type ?? 'application/octet-stream',
                'tag' => $a->description,
            ])->values()->toArray();
    }

    /**
     * Metadata for role-based buckets in the UI
     */
    public function getRequiredRoleInfo(string $level): array
    {
        return match ($level) {
            'management' => ['role_label' => 'Ban điều hành', 'role_icon' => 'business-outline', 'role_color' => '#F59E0B'],
            'accountant' => ['role_label' => 'Kế toán', 'role_icon' => 'calculator-outline', 'role_color' => '#10B981'],
            'project_manager' => ['role_label' => 'Quản lý dự án', 'role_icon' => 'construct-outline', 'role_color' => '#3B82F6'],
            'supervisor' => ['role_label' => 'Giám sát', 'role_icon' => 'search-outline', 'role_color' => '#8B5CF6'],
            'customer' => ['role_label' => 'Khách hàng', 'role_icon' => 'person-outline', 'role_color' => '#EF4444'],
            default => ['role_label' => 'Lịch sử', 'role_icon' => 'time-outline', 'role_color' => '#6B7280'],
        };
    }

    // =========================================================================
    // MAIN ENTRY POINT
    // =========================================================================

    /**
     * Get all approval data for a user.
     *
     * @param  object  $user          Authenticated user (Admin or API user)
     * @param  string  $type          Filter type ('all' or specific type like 'project_cost')
     * @return array   Keyed array of Eloquent collections + stats
     */
    public function getApprovalData($user, string $type = 'all'): array
    {
        $isSuperAdmin = $user->isSuperAdmin();
        $isCustomer = $user->isCustomer();

        $isGlobalApprover = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) 
            || $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)
            || $user->hasPermission(Permissions::PAYMENT_CONFIRM)
            || $user->hasPermission(Permissions::FINANCE_MANAGE);

        $canSeeAllProjects = $isSuperAdmin || $isGlobalApprover;
        
        // Define projects the user is explicitly linked to
        $projectIds = [];
        if (!$canSeeAllProjects) {
            $assignedViaPersonnel = $user->projects()->pluck('projects.id')->toArray();
            
            // Also include projects where user is explicitly set as Customer, PM or Supervisor on the project model
            $assignedViaModel = \App\Models\Project::where('customer_id', $user->id)
                ->orWhere('project_manager_id', $user->id)
                ->orWhere('supervisor_id', $user->id)
                ->pluck('id')
                ->toArray();
                
            $projectIds = array_unique(array_merge($assignedViaPersonnel, $assignedViaModel));
        }

        // Fetch centralized approvals for integrated models
        $query = Approval::where('status', 'pending')
            ->when(!$canSeeAllProjects, function ($q) use ($projectIds) {
                return $q->where(function ($sq) use ($projectIds) {
                    $sq->whereIn('project_id', $projectIds)
                       ->orWhereNull('project_id');
                });
            })
            ->with(['approvable', 'project:id,name,code', 'user:id,name']);

        $allApprovals = $query->get()->unique(fn($a) => $a->approvable_type . $a->approvable_id);

        $data = [];
        $data['projectIds'] = $projectIds; // For stats
        $data['approvals'] = $allApprovals; // New central source

        // ═══════════════════════════════════════════════════════════════
        // INTEGRATED MODELS (Using Centralized Approvals)
        // ═══════════════════════════════════════════════════════════════
        
        // Distribution of centralized approvals into their respective legacy buckets for compatibility
        $data['costs_management'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === Cost::class && 
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['costs_accountant'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === Cost::class && 
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        $data['acceptance_supervisor'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === AcceptanceStage::class && 
            ($a->approvable->status ?? '') === 'pending'
        )->pluck('approvable')->filter();

        $data['acceptance_pm'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === AcceptanceStage::class && 
            ($a->approvable->status ?? '') === 'supervisor_approved'
        )->pluck('approvable')->filter();

        $data['acceptance_customer'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === AcceptanceStage::class && 
            ($a->approvable->status ?? '') === 'project_manager_approved'
        )->pluck('approvable')->filter();

        $data['additional_costs'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === AdditionalCost::class
        )->pluck('approvable')->filter();

        $data['material_bills_management'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === MaterialBill::class && 
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['material_bills_accountant'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === MaterialBill::class && 
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        $data['payments_pending'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === ProjectPayment::class && 
            ($a->approvable->status ?? '') !== 'customer_paid'
        )->pluck('approvable')->filter();

        $data['payments_paid'] = $allApprovals->filter(fn($a) => 
            $a->approvable_type === ProjectPayment::class && 
            ($a->approvable->status ?? '') === 'customer_paid'
        )->pluck('approvable')->filter();

        // ═══════════════════════════════════════════════════════════════
        // ALL REMAINING MODELS (via Centralized Approvals)
        // ═══════════════════════════════════════════════════════════════

        // Acceptance Items (Hạng mục nghiệm thu)
        $data['acceptance_items'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === AcceptanceItem::class
        )->pluck('approvable')->filter();

        // Change Requests (Yêu cầu thay đổi)
        $data['change_requests'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === ChangeRequest::class
        )->pluck('approvable')->filter();

        // Subcontractor Payments (Thanh toán NTP)
        $data['sub_payments_management'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === SubcontractorPayment::class &&
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['sub_payments_accountant'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === SubcontractorPayment::class &&
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        // Subcontractor Acceptances (Nghiệm thu NTP)
        $data['sub_acceptances'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === SubcontractorAcceptance::class
        )->pluck('approvable')->filter();

        // Supplier Acceptances (Nghiệm thu NCC)
        $data['supplier_acceptances'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === SupplierAcceptance::class
        )->pluck('approvable')->filter();

        // Contracts (Hợp đồng)
        $data['contracts'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === Contract::class
        )->pluck('approvable')->filter();

        // Construction Logs (Nhật ký công trường)
        $data['construction_logs'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === ConstructionLog::class
        )->pluck('approvable')->filter();

        // Schedule Adjustments (Điều chỉnh tiến độ)
        $data['schedule_adjustments'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === ScheduleAdjustment::class
        )->pluck('approvable')->filter();

        // Defects (Lỗi chờ xác nhận)
        $data['defects'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === Defect::class
        )->pluck('approvable')->filter();

        // Project Budgets (Ngân sách dự án)
        $data['budgets'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === ProjectBudget::class
        )->pluck('approvable')->filter();

        // Equipment Rentals (Thuê thiết bị)
        $data['equipment_rentals_management'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === EquipmentRental::class &&
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['equipment_rentals_accountant'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === EquipmentRental::class &&
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        $data['equipment_rentals_return'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === EquipmentRental::class &&
            str_contains($a->approvable->status ?? '', 'return')
        )->pluck('approvable')->filter();

        // Asset Usages (Sử dụng thiết bị)
        $data['asset_usages_management'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === AssetUsage::class &&
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['asset_usages_accountant'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === AssetUsage::class &&
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        $data['asset_usages_return'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === AssetUsage::class &&
            str_contains($a->approvable->status ?? '', 'return')
        )->pluck('approvable')->filter();

        // Attendances (Chấm công chờ duyệt)
        $data['attendances_pending'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === Attendance::class
        )->pluck('approvable')->filter();

        // Equipment Purchases (Mua thiết bị mới)
        $data['equipment_purchases_management'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === \App\Models\EquipmentPurchase::class &&
            str_contains($a->approvable->status ?? '', 'management')
        )->pluck('approvable')->filter();

        $data['equipment_purchases_accountant'] = $allApprovals->filter(fn($a) =>
            $a->approvable_type === \App\Models\EquipmentPurchase::class &&
            str_contains($a->approvable->status ?? '', 'accountant')
        )->pluck('approvable')->filter();

        // ═══════════════════════════════════════════════════════════════
        // RECENT ACTIVITY (Hoạt động gần đây)
        // ═══════════════════════════════════════════════════════════════
        $data['recent'] = $this->getRecentActivity($canSeeAllProjects, $projectIds);

        // ═══════════════════════════════════════════════════════════════
        // STATS / KPI
        // ═══════════════════════════════════════════════════════════════
        $data['stats'] = $this->getStats($user, $canSeeAllProjects, $projectIds, $data);

        return $data;
    }

    // =========================================================================
    // COST QUERY — Always excludes linked costs
    // =========================================================================

    /**
     * Query costs with built-in duplicate prevention.
     * ALWAYS excludes costs linked to MaterialBills or SubcontractorPayments.
     */
    /**
     * Query costs with built-in duplicate prevention.
     * ALWAYS excludes costs linked to MaterialBills or SubcontractorPayments.
     */
    private function getCosts(array $statuses, bool $canSeeAllProjects, array $projectIds, array $relations): Collection
    {
        return Cost::whereIn('status', $statuses)
            ->whereNull('material_bill_id')
            ->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, function ($q) use ($projectIds) {
                // For non-Global/SuperAdmins: 
                // 1. Show Project Costs they belong to.
                // 2. Show Company Costs (project_id IS NULL)
                return $q->where(function ($sq) use ($projectIds) {
                    $sq->whereIn('project_id', $projectIds)
                       ->orWhereNull('project_id');
                });
            })
            ->with($relations)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // =========================================================================
    // RECENT ACTIVITY
    // =========================================================================

    private function getRecentActivity(bool $canSeeAllProjects, array $projectIds): array
    {
        $recentApprovals = Approval::whereIn('status', ['approved', 'rejected'])
            ->when(!$canSeeAllProjects, function ($q) use ($projectIds) {
                return $q->where(function ($sq) use ($projectIds) {
                    $sq->whereIn('project_id', $projectIds)
                       ->orWhereNull('project_id');
                });
            })
            ->with(['approvable', 'project:id,name,code', 'user:id,name'])
            ->orderBy('updated_at', 'desc')
            ->limit(30)
            ->get();

        return [
            'approvals' => $recentApprovals,
            'costs' => $recentApprovals->filter(fn($a) => $a->approvable_type === Cost::class)->pluck('approvable')->filter(),
            'change_requests' => $recentApprovals->filter(fn($a) => $a->approvable_type === ChangeRequest::class)->pluck('approvable')->filter(),
            'additional_costs' => $recentApprovals->filter(fn($a) => $a->approvable_type === AdditionalCost::class)->pluck('approvable')->filter(),
            'sub_payments' => $recentApprovals->filter(fn($a) => $a->approvable_type === SubcontractorPayment::class)->pluck('approvable')->filter(),
            'acceptances' => $recentApprovals->filter(fn($a) => $a->approvable_type === AcceptanceStage::class)->pluck('approvable')->filter(),
            'budgets' => $recentApprovals->filter(fn($a) => $a->approvable_type === ProjectBudget::class)->pluck('approvable')->filter(),
            'equipment_rentals' => $recentApprovals->filter(fn($a) => $a->approvable_type === EquipmentRental::class)->pluck('approvable')->filter(),
            'asset_usages' => $recentApprovals->filter(fn($a) => $a->approvable_type === AssetUsage::class)->pluck('approvable')->filter(),
            'contracts' => $recentApprovals->filter(fn($a) => $a->approvable_type === Contract::class)->pluck('approvable')->filter(),
            'project_payments' => $recentApprovals->filter(fn($a) => $a->approvable_type === ProjectPayment::class)->pluck('approvable')->filter(),
            'material_bills' => $recentApprovals->filter(fn($a) => $a->approvable_type === MaterialBill::class)->pluck('approvable')->filter(),
            'sub_acceptances' => $recentApprovals->filter(fn($a) => $a->approvable_type === SubcontractorAcceptance::class)->pluck('approvable')->filter(),
            'supplier_acceptances' => $recentApprovals->filter(fn($a) => $a->approvable_type === SupplierAcceptance::class)->pluck('approvable')->filter(),
            'construction_logs' => $recentApprovals->filter(fn($a) => $a->approvable_type === ConstructionLog::class)->pluck('approvable')->filter(),
            'schedule_adjustments' => $recentApprovals->filter(fn($a) => $a->approvable_type === ScheduleAdjustment::class)->pluck('approvable')->filter(),
            'defects' => $recentApprovals->filter(fn($a) => $a->approvable_type === Defect::class)->pluck('approvable')->filter(),
            'equipment_purchases' => $recentApprovals->filter(fn($a) => $a->approvable_type === \App\Models\EquipmentPurchase::class)->pluck('approvable')->filter(),
            'attendances' => $recentApprovals->filter(fn($a) => $a->approvable_type === Attendance::class)->pluck('approvable')->filter(),
            'acceptance_items' => $recentApprovals->filter(fn($a) => $a->approvable_type === AcceptanceItem::class)->pluck('approvable')->filter(),
        ];
    }

    // =========================================================================
    // STATS / KPI
    // =========================================================================

    private function getStats($user, bool $canSeeAllProjects, array $projectIds, array $data): array
    {
        $isCustomer = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3);
        $allApprovals = $data['approvals'] ?? collect();

        // Count pending by group for the dashboard
        $realPendingManagement = $allApprovals->filter(function($a) {
            $status = $a->approvable->status ?? '';
            $type = $a->approvable_type;
            return (
                ($type === Cost::class && in_array($status, ['pending', 'pending_management_approval'])) ||
                ($type === MaterialBill::class && in_array($status, ['pending', 'pending_management'])) ||
                ($type === AdditionalCost::class) ||
                ($type === SubcontractorPayment::class && $status === 'pending_management_approval') ||
                ($type === EquipmentRental::class && $status === 'pending_management') ||
                ($type === AssetUsage::class && $status === 'pending_management') ||
                ($type === \App\Models\EquipmentPurchase::class && $status === 'pending_management') ||
                ($type === \App\Models\Equipment::class && $status === 'pending_management')
            );
        })->count();

        $realPendingAccountant = $allApprovals->filter(function($a) {
            $status = $a->approvable->status ?? '';
            $type = $a->approvable_type;
            return (
                ($type === Cost::class && $status === 'pending_accountant_approval') ||
                ($type === MaterialBill::class && $status === 'pending_accountant') ||
                ($type === ProjectPayment::class && $status === 'customer_paid') ||
                ($type === SubcontractorPayment::class && $status === 'pending_accountant_confirmation') ||
                ($type === EquipmentRental::class && in_array($status, ['pending_accountant', 'pending_return'])) ||
                ($type === AssetUsage::class && in_array($status, ['pending_accountant', 'pending_return'])) ||
                ($type === \App\Models\EquipmentPurchase::class && $status === 'pending_accountant') ||
                ($type === \App\Models\Equipment::class && $status === 'pending_accountant')
            );
        })->count();

        $realPendingAcceptance = $allApprovals->filter(fn($a) => 
            $a->approvable_type === AcceptanceStage::class
        )->count();
        
        // Stats for TODAY from centralized table
        $approvedToday = Approval::where('status', 'approved')->whereDate('updated_at', today())
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        $rejectedToday = Approval::where('status', 'rejected')->whereDate('updated_at', today())
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        // Amount calculation
        $totalPendingAmount = $allApprovals->sum(function($a) {
            return (float) ($a->metadata['amount'] ?? $a->metadata['total_amount'] ?? $a->metadata['total_cost'] ?? 0);
        });

        $isSuperAdmin = $user->isSuperAdmin();

        return [
            'pending_management' => ($isCustomer && !$isSuperAdmin) ? 0 : $realPendingManagement,
            'pending_accountant' => ($isCustomer && !$isSuperAdmin) ? 0 : $realPendingAccountant,
            'pending_acceptance' => $realPendingAcceptance,
            'pending_others' => $allApprovals->count(), 
            'approved_today' => $approvedToday,
            'rejected_today' => $rejectedToday,
            'total_pending_amount' => (float) $totalPendingAmount,
        ];
    }

    // =========================================================================
    // STATUS LABELS (shared between CRM and Mobile)
    // =========================================================================

    public function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Nháp',
            'pending', 'pending_approval' => 'Chờ duyệt',
            'pending_management_approval', 'pending_management' => 'Chờ BĐH duyệt',
            'pending_accountant_approval', 'pending_accountant' => 'Chờ KT xác nhận',
            'pending_accountant_confirmation' => 'Chờ KT xác nhận',
            'pending_customer_approval', 'customer_pending_approval' => 'Chờ duyệt',
            'project_manager_approved' => 'Đã duyệt (PM)',
            'supervisor_approved' => 'Chờ QLDA duyệt',
            'submitted' => 'Đã gửi',
            'under_review' => 'Đang xem xét',
            'approved', 'customer_approved' => 'Đã duyệt',
            'paid', 'customer_paid' => 'Đã thanh toán (Chờ xác nhận)',
            'rejected' => 'Bị từ chối',
            'fixed' => 'Đã sửa — Chờ xác nhận',
            'verified' => 'Đã xác nhận',
            'pending_return' => 'Chờ xác nhận trả',
            'overdue' => 'Quá hạn (Chờ thanh toán)',
            default => $status,
        };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function shouldInclude(string $type, array $types): bool
    {
        return in_array($type, $types);
    }

    /**
     * Build mobile-specific items array
     */
    private function buildMobileItems($user, $data, $type = 'all', $canApproveManagement = false, $canApproveAccountant = false)
    {
        $items = [];
        
        // Visibility flags
        $showManagement = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_MANAGEMENT) || $user->isSuperAdmin();
        $showAccountant = $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_ACCOUNTANT) || $user->isSuperAdmin();
        $showPM = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2) || $user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE) || $user->hasPermission(Permissions::BUDGET_APPROVE) || $user->isSuperAdmin();
        $showSupervisor = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1) || $user->hasPermission(Permissions::LOG_APPROVE) || $user->isSuperAdmin();
        $showCustomer = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_2) || $user->hasPermission(Permissions::PAYMENT_APPROVE) || $user->isSuperAdmin();

        // 1. MANAGEMENT BUCKET
        if ($showManagement) {
            foreach ($data['costs_management']->whereNotNull('project_id') as $c) {
                if ($type === 'all' || $type === 'management' || $type === 'project_cost') {
                    $items[] = array_merge($this->mapCostToItem($c, 'project_cost', $canApproveManagement, false), ['role_group' => 'management']);
                }
            }
            foreach ($data['costs_management']->whereNull('project_id') as $c) {
                if ($type === 'all' || $type === 'management' || $type === 'company_cost') {
                    $items[] = array_merge($this->mapCostToItem($c, 'company_cost', $canApproveManagement, false), ['role_group' => 'management']);
                }
            }
            if ($type === 'all' || $type === 'management' || $type === 'material_bill') {
                foreach ($data['material_bills_management'] ?? [] as $b) {
                    $items[] = [
                        'id' => $b->id, 'type' => 'material_bill', 'title' => 'Vật tư: ' . ($b->bill_number ?? "#{$b->id}"),
                        'subtitle' => $b->project->name ?? 'Dự án', 'amount' => (float) ($b->total_amount ?? 0),
                        'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                        'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                        'project_id' => $b->project_id, 'can_approve' => $canApproveManagement,
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($b),
                        'attachments_count' => $b->attachments->count(),
                    ];
                }
            }
            // CR, AC, Budgets, Sub Acceptances
            if ($type === 'all' || $type === 'management' || $type === 'change_request') {
                foreach ($data['change_requests'] ?? [] as $cr) {
                    $items[] = [
                        'id' => $cr->id, 'type' => 'change_request', 'title' => 'CR: ' . $cr->title,
                        'subtitle' => $cr->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $cr->status, 'status_label' => $this->getStatusLabel($cr->status),
                        'created_by' => $cr->requester->name ?? 'N/A', 'created_at' => $cr->created_at->toISOString(),
                        'project_id' => $cr->project_id, 'can_approve' => $user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE) || $user->isSuperAdmin(), 
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($cr),
                        'attachments_count' => $cr->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'management' || $type === 'additional_cost') {
                foreach ($data['additional_costs'] ?? [] as $ac) {
                    $items[] = [
                        'id' => $ac->id, 'type' => 'additional_cost', 'title' => 'Phát sinh: ' . $ac->name,
                        'subtitle' => $ac->project->name ?? 'Dự án', 'amount' => (float) $ac->amount,
                        'status' => $ac->status, 'status_label' => $this->getStatusLabel($ac->status),
                        'created_by' => $ac->proposer->name ?? 'N/A', 'created_at' => $ac->created_at->toISOString(),
                        'project_id' => $ac->project_id, 'can_approve' => $user->hasPermission(Permissions::ADDITIONAL_COST_APPROVE) || $user->isSuperAdmin(), 
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($ac),
                        'attachments_count' => $ac->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'management' || $type === 'budget') {
                foreach ($data['budgets'] ?? [] as $b) {
                    $items[] = [
                        'id' => $b->id, 'type' => 'budget', 'title' => 'Ngân sách: ' . ($b->project->name ?? "Dự án"),
                        'subtitle' => 'Phiên bản ' . $b->version, 'amount' => (float) $b->total_budget,
                        'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                        'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                        'project_id' => $b->project_id, 'can_approve' => $user->hasPermission(Permissions::BUDGET_APPROVE) || $user->isSuperAdmin(), 
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($b),
                        'attachments_count' => $b->attachments->count(),
                    ];
                }
            }

            // Equipment Related (Management)
            if ($type === 'all' || $type === 'management' || $type === 'equipment_rental') {
                foreach ($data['equipment_rentals_management'] ?? [] as $r) {
                    $items[] = [
                        'id' => $r->id, 'type' => 'equipment_rental', 'title' => 'Thuê TB: ' . ($r->equipment_name ?: ($r->equipment->name ?? 'N/A')),
                        'subtitle' => $r->project->name ?? 'Dự án', 'amount' => (float) $r->total_cost,
                        'status' => $r->status, 'status_label' => $this->getStatusLabel($r->status),
                        'created_by' => $r->creator->name ?? 'N/A', 'created_at' => $r->created_at->toISOString(),
                        'project_id' => $r->project_id, 'can_approve' => $canApproveManagement,
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($r),
                        'attachments_count' => $r->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'management' || $type === 'asset_usage') {
                foreach ($data['asset_usages_management'] ?? [] as $u) {
                    $items[] = [
                        'id' => $u->id, 'type' => 'asset_usage', 'title' => 'Sử dụng TB: ' . ($u->asset->name ?? 'N/A'),
                        'subtitle' => ($u->project->code ?? '') . ' - ' . ($u->project->name ?? 'Dự án'), 'amount' => 0,
                        'status' => $u->status, 'status_label' => $this->getStatusLabel($u->status),
                        'created_by' => $u->creator->name ?? 'N/A', 'created_at' => $u->created_at->toISOString(),
                        'project_id' => $u->project_id, 'can_approve' => $canApproveManagement,
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($u),
                        'attachments_count' => $u->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'management' || $type === 'equipment_purchase') {
                foreach ($data['equipment_purchases_management'] ?? [] as $p) {
                    $items[] = [
                        'id' => $p->id, 'type' => 'equipment_purchase', 'title' => 'Mua TB mới: ' . ($p->project->name ?? 'Dự án'),
                        'subtitle' => 'Tổng cộng: ' . number_format($p->total_amount, 0) . 'đ', 'amount' => (float) $p->total_amount,
                        'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                        'created_by' => $p->creator->name ?? 'N/A', 'created_at' => $p->created_at->toISOString(),
                        'project_id' => $p->project_id, 'can_approve' => $canApproveManagement,
                        'approval_level' => 'management', 'role_group' => 'management',
                        'attachments' => $this->formatAttachments($p),
                        'attachments_count' => $p->attachments->count(),
                    ];
                }
            }
        }

        // 2. ACCOUNTANT BUCKET
        if ($showAccountant) {
            foreach ($data['costs_accountant'] ?? [] as $c) {
                if ($type === 'all' || $type === 'accountant' || $type === 'project_cost' || $type === 'company_cost') {
                    $items[] = array_merge($this->mapCostToItem($c, $c->project_id ? 'project_cost' : 'company_cost', false, $canApproveAccountant), ['role_group' => 'accountant']);
                }
            }
            if ($type === 'all' || $type === 'accountant' || $type === 'material_bill') {
                foreach ($data['material_bills_accountant'] ?? [] as $b) {
                    $items[] = [
                        'id' => $b->id, 'type' => 'material_bill', 'title' => 'Vật tư: ' . ($b->bill_number ?? "#{$b->id}"),
                        'subtitle' => $b->project->name ?? 'Dự án', 'amount' => (float) ($b->total_amount ?? 0),
                        'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                        'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                        'project_id' => $b->project_id, 'can_approve' => $canApproveAccountant,
                        'approval_level' => 'accountant', 'role_group' => 'accountant',
                        'attachments' => $this->formatAttachments($b),
                        'attachments_count' => $b->attachments->count(),
                    ];
                }
            }

            // Equipment Related (Accountant)
            if ($type === 'all' || $type === 'accountant' || $type === 'equipment_rental') {
                foreach (($data['equipment_rentals_accountant'] ?? collect())->concat($data['equipment_rentals_return'] ?? collect())->unique('id') as $r) {
                    $items[] = [
                        'id' => $r->id, 'type' => 'equipment_rental', 'title' => 'Thuê TB: ' . ($r->equipment_name ?: ($r->equipment->name ?? 'N/A')),
                        'subtitle' => $r->project->name ?? 'Dự án', 'amount' => (float) $r->total_cost,
                        'status' => $r->status, 'status_label' => $this->getStatusLabel($r->status),
                        'created_by' => $r->creator->name ?? 'N/A', 'created_at' => $r->created_at->toISOString(),
                        'project_id' => $r->project_id, 'can_approve' => $canApproveAccountant,
                        'approval_level' => 'accountant', 'role_group' => 'accountant',
                        'attachments' => $this->formatAttachments($r),
                        'attachments_count' => $r->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'accountant' || $type === 'asset_usage') {
                foreach (($data['asset_usages_accountant'] ?? collect())->concat($data['asset_usages_return'] ?? collect())->unique('id') as $u) {
                    $items[] = [
                        'id' => $u->id, 'type' => 'asset_usage', 'title' => 'Sử dụng TB: ' . ($u->asset->name ?? 'N/A'),
                        'subtitle' => ($u->project->code ?? '') . ' - ' . ($u->project->name ?? 'Dự án'), 'amount' => 0,
                        'status' => $u->status, 'status_label' => $this->getStatusLabel($u->status),
                        'created_by' => $u->creator->name ?? 'N/A', 'created_at' => $u->created_at->toISOString(),
                        'project_id' => $u->project_id, 'can_approve' => $canApproveAccountant,
                        'approval_level' => 'accountant', 'role_group' => 'accountant',
                        'attachments' => $this->formatAttachments($u),
                        'attachments_count' => $u->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'accountant' || $type === 'equipment_purchase') {
                foreach ($data['equipment_purchases_accountant'] ?? [] as $p) {
                    $items[] = [
                        'id' => $p->id, 'type' => 'equipment_purchase', 'title' => 'Mua TB mới: ' . ($p->project->name ?? 'Dự án'),
                        'subtitle' => 'Tổng cộng: ' . number_format($p->total_amount, 0) . 'đ', 'amount' => (float) $p->total_amount,
                        'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                        'created_by' => $p->creator->name ?? 'N/A', 'created_at' => $p->created_at->toISOString(),
                        'project_id' => $p->project_id, 'can_approve' => $canApproveAccountant,
                        'approval_level' => 'accountant', 'role_group' => 'accountant',
                        'attachments' => $this->formatAttachments($p),
                        'attachments_count' => $p->attachments->count(),
                    ];
                }
            }
            if ($type === 'all' || $type === 'accountant' || $type === 'sub_payment') {
                foreach (($data['sub_payments_management'] ?? collect())->concat($data['sub_payments_accountant'] ?? collect())->unique('id') as $p) {
                    $level = str_contains($p->status, 'management') ? 'management' : 'accountant';
                    if ($type === 'all' || $type === $level || $type === 'sub_payment') {
                        $items[] = [
                            'id' => $p->id, 'type' => 'sub_payment', 'title' => 'TT NTP: ' . ($p->subcontractor->name ?? 'NTP'),
                            'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                            'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                            'created_by' => $p->creator->name ?? 'N/A', 'created_at' => $p->created_at->toISOString(),
                            'project_id' => $p->project_id, 'can_approve' => ($level === 'management' ? $canApproveManagement : $canApproveAccountant), 
                            'approval_level' => $level, 'role_group' => $level === 'management' ? 'management' : 'accountant',
                            'attachments' => $this->formatAttachments($p),
                            'attachments_count' => $p->attachments->count(),
                        ];
                    }
                }
            }
            if ($type === 'all' || $type === 'accountant' || $type === 'payment') {
                foreach ($data['payments_paid'] ?? [] as $p) {
                    $items[] = [
                        'id' => $p->id, 'type' => 'payment', 'title' => 'TT Dự án: # ' . ($p->payment_number ?? $p->id),
                        'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                        'status' => $p->status, 'status_label' => 'Cần xác nhận',
                        'created_by' => 'KH đã up chứng từ', 'created_at' => $p->updated_at->toISOString(),
                        'project_id' => $p->project_id, 'can_approve' => $canApproveAccountant,
                        'approval_level' => 'accountant', 'role_group' => 'accountant',
                        'attachments' => $this->formatAttachments($p),
                        'attachments_count' => $p->attachments->count(),
                    ];
                }
            }
        }

        // 3. PROJECT MANAGER BUCKET
        if ($showPM) {
            if ($type === 'all' || $type === 'project_manager' || $type === 'acceptance') {
                foreach ($data['acceptance_pm'] ?? [] as $st) {
                    $items[] = [
                        'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                        'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $st->status, 'status_label' => 'QLDA duyệt',
                        'created_by' => $st->task->assignee->name ?? ($st->project->projectManager->name ?? 'PM'), 
                        'created_at' => $st->created_at->toISOString(),
                        'project_id' => $st->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2) || $user->isSuperAdmin(), 
                        'approval_level' => 'project_manager', 'role_group' => 'project_manager',
                        'attachments' => $this->formatAttachments($st),
                        'attachments_count' => $st->attachments->count(),
                    ];
                }
            }
            // Defects for PM
            foreach ($data['defects'] ?? [] as $defect) {
                if ($defect->acceptanceStage && $defect->acceptanceStage->status === 'supervisor_approved') {
                    $items[] = [
                        'id' => $defect->id, 'type' => 'defect_verify', 'title' => 'Lỗi: ' . Str::limit($defect->description, 40),
                        'subtitle' => $defect->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $defect->status, 'status_label' => $this->getDefectStatusLabel($defect->status),
                        'created_by' => $defect->fixer->name ?? 'N/A', 'created_at' => optional($defect->fixed_at ?? $defect->created_at)->toISOString(),
                        'project_id' => $defect->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2) || $user->isSuperAdmin(),
                        'approval_level' => 'project_manager', 'role_group' => 'project_manager',
                        'attachments' => $this->formatAttachments($defect),
                        'attachments_count' => $defect->attachments->count(),
                        'before_attachments' => $this->formatAttachmentsByTag($defect, 'before'),
                        'after_attachments' => $this->formatAttachmentsByTag($defect, 'after'),
                    ];
                }
            }
        }

        // 4. SUPERVISOR BUCKET
        if ($showSupervisor) {
            if ($type === 'all' || $type === 'supervisor' || $type === 'acceptance') {
                foreach ($data['acceptance_supervisor'] ?? [] as $st) {
                    $items[] = [
                        'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                        'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $st->status, 'status_label' => 'GS duyệt',
                        'created_by' => $st->task->assignee->name ?? 'NV', 
                        'created_at' => $st->created_at->toISOString(),
                        'project_id' => $st->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1) || $user->isSuperAdmin(), 
                        'approval_level' => 'supervisor', 'role_group' => 'supervisor',
                        'attachments' => $this->formatAttachments($st),
                        'attachments_count' => $st->attachments->count(),
                    ];
                }
            }
            // Defects for Supervisor
            foreach ($data['defects'] ?? [] as $defect) {
                // If no acceptanceStage, or acceptanceStage is pending/rejected, it's for supervisor
                if (!$defect->acceptanceStage || in_array($defect->acceptanceStage->status, ['pending', 'rejected'])) {
                    $items[] = [
                        'id' => $defect->id, 'type' => 'defect_verify', 'title' => 'Lỗi: ' . Str::limit($defect->description, 40),
                        'subtitle' => $defect->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $defect->status, 'status_label' => $this->getDefectStatusLabel($defect->status),
                        'created_by' => $defect->fixer->name ?? 'N/A', 'created_at' => optional($defect->fixed_at ?? $defect->created_at)->toISOString(),
                        'project_id' => $defect->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1) || $user->isSuperAdmin(),
                        'approval_level' => 'supervisor', 'role_group' => 'supervisor',
                        'attachments' => $this->formatAttachments($defect),
                        'attachments_count' => $defect->attachments->count(),
                        'before_attachments' => $this->formatAttachmentsByTag($defect, 'before'),
                        'after_attachments' => $this->formatAttachmentsByTag($defect, 'after'),
                    ];
                }
            }
        }

        // 5. CUSTOMER BUCKET
        if ($showCustomer) {
            if ($type === 'all' || $type === 'customer' || $type === 'acceptance') {
                foreach ($data['acceptance_customer'] ?? [] as $st) {
                    $items[] = [
                        'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                        'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $st->status, 'status_label' => 'KH duyệt',
                        'created_by' => $st->project->projectManager->name ?? 'PM', 
                        'created_at' => $st->created_at->toISOString(),
                        'project_id' => $st->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $user->isSuperAdmin(), 
                        'approval_level' => 'customer', 'role_group' => 'customer',
                        'attachments' => $this->formatAttachments($st),
                        'attachments_count' => $st->attachments->count(),
                    ];
                }
            }
            // Defects for Customer
            foreach ($data['defects'] ?? [] as $defect) {
                if ($defect->acceptanceStage && $defect->acceptanceStage->status === 'project_manager_approved') {
                    $items[] = [
                        'id' => $defect->id, 'type' => 'defect_verify', 'title' => 'Lỗi: ' . Str::limit($defect->description, 40),
                        'subtitle' => $defect->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $defect->status, 'status_label' => $this->getDefectStatusLabel($defect->status),
                        'created_by' => $defect->fixer->name ?? 'N/A', 'created_at' => optional($defect->fixed_at ?? $defect->created_at)->toISOString(),
                        'project_id' => $defect->project_id, 'can_approve' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $user->isSuperAdmin(),
                        'approval_level' => 'customer', 'role_group' => 'customer',
                        'attachments' => $this->formatAttachments($defect),
                        'attachments_count' => $defect->attachments->count(),
                        'before_attachments' => $this->formatAttachmentsByTag($defect, 'before'),
                        'after_attachments' => $this->formatAttachmentsByTag($defect, 'after'),
                    ];
                }
            }
            // Contracts for Customer
            if ($type === 'all' || $type === 'customer' || $type === 'contract') {
                foreach ($data['contracts'] ?? [] as $contract) {
                    $items[] = [
                        'id' => $contract->id, 'type' => 'contract', 'title' => 'Hợp đồng: ' . ($contract->contract_number ?? 'Mới'),
                        'subtitle' => $contract->project->name ?? 'Dự án', 'amount' => (float) $contract->contract_value,
                        'status' => $contract->status, 'status_label' => 'Chờ ký',
                        'created_by' => 'Hệ thống', 'created_at' => $contract->updated_at->toISOString(),
                        'project_id' => $contract->project_id, 'can_approve' => $user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_2) || $user->isSuperAdmin(), 
                        'approval_level' => 'customer', 'role_group' => 'customer',
                        'attachments' => $this->formatAttachments($contract),
                        'attachments_count' => $contract->attachments->count(),
                    ];
                }
            }

            if ($type === 'all' || $type === 'customer' || $type === 'payment') {
                foreach (($data['payments_pending'] ?? collect())->unique('id') as $p) {
                    $itemType = 'payment';
                    $statusLabel = $this->getStatusLabel($p->status);
                    
                    if ($p->status === 'customer_pending_approval') {
                        $statusLabel = 'Duyệt chứng từ';
                    } elseif ($p->status === 'pending') {
                        $statusLabel = 'Cần thanh toán';
                        $itemType = 'payment_reminder';
                    } elseif ($p->status === 'overdue') {
                        $statusLabel = 'TRỄ HẠN';
                        $itemType = 'payment_reminder';
                    }

                    $items[] = [
                        'id' => $p->id, 'type' => $itemType, 'title' => 'TT Dự án: # ' . ($p->payment_number ?? 'N/A'),
                        'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                        'status' => $p->status, 'status_label' => $statusLabel,
                        'created_by' => 'Hệ thống', 'created_at' => $p->updated_at->toISOString(),
                        'project_id' => $p->project_id, 'can_approve' => $user->hasPermission(Permissions::PAYMENT_APPROVE) || $user->isSuperAdmin(),
                        'approval_level' => 'customer', 'role_group' => 'customer',
                        'attachments' => $this->formatAttachments($p),
                        'attachments_count' => $p->attachments->count(),
                        'due_date' => $p->due_date ? $p->due_date->toISOString() : null,
                    ];
                }
            }
        }

        // 6. HR BUCKET — Attendance pending approval
        $showHr = $user->hasPermission(Permissions::ATTENDANCE_APPROVE) || $user->isSuperAdmin();
        if ($showHr && ($type === 'all' || $type === 'hr' || $type === 'attendance')) {
            foreach ($data['attendances_pending'] ?? [] as $att) {
                $hours = $att->hours_worked ? number_format($att->hours_worked, 1) . 'h' : null;
                $ot = $att->overtime_hours > 0 ? ' (OT ' . $att->overtime_hours . 'h)' : '';
                $statusLabels = ['present' => 'Có mặt', 'absent' => 'Vắng', 'late' => 'Trễ', 'half_day' => 'Nửa ngày', 'leave' => 'Nghỉ phép', 'holiday' => 'Nghỉ lễ'];
                $items[] = [
                    'id'               => $att->id,
                    'type'             => 'attendance',
                    'title'            => ($att->user->name ?? "NV #{$att->user_id}") . ' — ' . optional($att->work_date)->format('d/m/Y'),
                    'subtitle'         => ($att->project->code ?? 'N/A') . ' - ' . ($att->project->name ?? 'Không có dự án'),
                    'amount'           => 0,
                    'status'           => $att->workflow_status,
                    'status_label'     => 'Chờ duyệt',
                    'description'      => ($statusLabels[$att->status] ?? $att->status) . ($hours ? " · {$hours}" : '') . $ot,
                    'created_by'       => $att->user->name ?? 'N/A',
                    'created_at'       => optional($att->work_date)->toISOString() ?? now()->toISOString(),
                    'project_id'       => $att->project_id,
                    'project_name'     => $att->project->name ?? null,
                    'can_approve'      => true,
                    'approval_level'   => 'hr',
                    'role_group'       => 'hr',
                    'attachments'      => [],
                    'attachments_count'=> 0,
                ];
            }
        }

        return $items;
    }

    /**
     * Build recent activity for mobile
     */
    private function buildRecentMobileItems($user, $data)
    {
        $recentActions = collect([]);
        $recent = $data['recent'];
        
        $showManagement = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_MANAGEMENT) || $user->isSuperAdmin();
        $showAccountant = $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_ACCOUNTANT) || $user->isSuperAdmin();
        $showPM = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2) || $user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE) || $user->hasPermission(Permissions::BUDGET_APPROVE) || $user->isSuperAdmin();

        if ($showManagement || $showAccountant) {
            foreach ($recent['costs'] as $item) {
                $isMgmt = str_contains($item->status, 'management');
                if (($isMgmt && $showManagement) || (!$isMgmt && $showAccountant)) {
                    $recentActions->push($this->mapCostToItem($item, $item->project_id ? 'project_cost' : 'company_cost', false, false));
                }
            }
        }
        
        if ($showPM && isset($recent['change_requests'])) {
            foreach ($recent['change_requests'] as $item) {
                $recentActions->push(['id' => $item->id, 'type' => 'change_request', 'title' => 'CR: ' . $item->title, 'subtitle' => $item->project->name ?? 'Dự án', 'amount' => 0, 'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status), 'created_at' => $item->updated_at->toISOString(), 'approval_level' => 'history']);
            }
        }
        
        return $recentActions->sortByDesc('created_at')->values()->all();
    }

    /**
     * Build summary counts for mobile tabs
     */
    /**
     * Build summary counts from already processed mobile items
     */
    private function buildMobileSummaryFromProcessedItems($user, array $allItems)
    {
        $counts = ['management' => 0, 'accountant' => 0, 'project_manager' => 0, 'supervisor' => 0, 'customer' => 0, 'hr' => 0];
        
        foreach ($allItems as $it) {
            if (isset($it['role_group']) && isset($counts[$it['role_group']])) {
                $counts[$it['role_group']]++;
            }
        }

        $summary = [];
        $groups = [
            ['type' => 'management', 'label' => 'Ban điều hành', 'icon' => 'business-outline', 'color' => '#F59E0B'],
            ['type' => 'accountant', 'label' => 'Kế toán', 'icon' => 'calculator-outline', 'color' => '#10B981'],
            ['type' => 'project_manager', 'label' => 'Quản lý dự án', 'icon' => 'construct-outline', 'color' => '#3B82F6'],
            ['type' => 'supervisor', 'label' => 'Giám sát', 'icon' => 'search-outline', 'color' => '#8B5CF6'],
            ['type' => 'customer', 'label' => 'Khách hàng', 'icon' => 'person-outline', 'color' => '#EF4444'],
            ['type' => 'hr', 'label' => 'Nhân sự', 'icon' => 'people-outline', 'color' => '#06B6D4'],
        ];

        $visibility = [
            'management' => $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_MANAGEMENT) || $user->isSuperAdmin(),
            'accountant' => $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT) || $user->hasPermission(Permissions::COMPANY_COST_APPROVE_ACCOUNTANT) || $user->isSuperAdmin(),
            'project_manager' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2) || $user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE) || $user->hasPermission(Permissions::BUDGET_APPROVE) || $user->isSuperAdmin(),
            'supervisor' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1) || $user->hasPermission(Permissions::LOG_APPROVE) || $user->isSuperAdmin(),
            'customer' => $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_2) || $user->hasPermission(Permissions::PAYMENT_APPROVE) || $user->isSuperAdmin(),
            'hr' => $user->hasPermission(Permissions::ATTENDANCE_APPROVE) || $user->isSuperAdmin(),
        ];

        foreach ($groups as $g) {
            if ($visibility[$g['type']]) {
                $summary[] = array_merge($g, ['total' => $counts[$g['type']]]);
            }
        }

        return $summary;
    }

    /**
     * Get related budget items for cost linking (Accountant context)
     */
    private function getBudgetItemsForContext($user, array $items, bool $canApproveAccountant): array
    {
        $budgetItemsByProject = [];
        if (!$canApproveAccountant) return [];

        $pids = collect($items)
            ->filter(fn($i) => in_array($i['approval_level'] ?? '', ['accountant']) && !empty($i['project_id']))
            ->pluck('project_id')
            ->unique()->values();

        if ($pids->isNotEmpty()) {
            $budgets = ProjectBudget::whereIn('project_id', $pids)
                ->where('status', 'approved')
                ->with(['items.costGroup'])->get();

            foreach ($budgets as $budget) {
                $pid = $budget->project_id;
                $budgetItemsByProject[$pid] = $budget->items->map(fn($it) => [
                    'id' => $it->id, 'name' => $it->name, 'budget_name' => $budget->name,
                    'cost_group' => $it->costGroup?->name, 'estimated_amount' => (float) $it->estimated_amount,
                    'actual_amount' => (float) $it->actual_amount, 'remaining_amount' => (float) ($it->estimated_amount - $it->actual_amount),
                ])->toArray();
            }
        }
        return $budgetItemsByProject;
    }
    private function getDefectStatusLabel(string $status): string
    {
        return match ($status) {
            'open' => 'Mới',
            'rejected' => 'Chưa đạt',
            'in_progress' => 'Đang sửa lỗi',
            'fixed' => 'Đã sửa — Chờ xác nhận',
            'verified' => 'Đã xác nhận',
            default => $status,
        };
    }
}
