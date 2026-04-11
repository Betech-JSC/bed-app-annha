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
use App\Models\User;
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

        // Define global approver roles (Accountant, Business Management, etc.)
        // These roles should see pending items from ALL projects even if not explicitly assigned as personnel.
        $isGlobalApprover = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) 
            || $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)
            || $user->hasPermission(Permissions::FINANCE_MANAGE);

        $canSeeAllProjects = $isSuperAdmin || $isGlobalApprover;
        $projectIds = $canSeeAllProjects ? [] : $user->projects()->pluck('projects.id')->toArray();

        $data = [];

        // ═══════════════════════════════════════════════════════════════
        // COSTS (Chi phí) — with linked-cost exclusion built in
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'project_cost', 'company_cost'])) {
            $data['costs_management'] = $this->getCosts(
                ['draft', 'pending', 'pending_management_approval', 'rejected'],
                $canSeeAllProjects, $projectIds,
                ['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'attachments']
            );

            $data['costs_accountant'] = $this->getCosts(
                ['pending_accountant_approval', 'approved'],
                $canSeeAllProjects, $projectIds,
                ['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments']
            );
        }

        // ═══════════════════════════════════════════════════════════════
        // ACCEPTANCE STAGES (Nghiệm thu)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'acceptance_supervisor'])) {
            $data['acceptance_supervisor'] = AcceptanceStage::where('status', 'pending')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        if ($this->shouldInclude($type, ['all', 'acceptance_pm'])) {
            $data['acceptance_pm'] = AcceptanceStage::where('status', 'supervisor_approved')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'supervisorApprover:id,name', 'task:id,name', 'attachments'])
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        if ($this->shouldInclude($type, ['all', 'acceptance', 'acceptance_customer'])) {
            $data['acceptance_customer'] = AcceptanceStage::where('status', 'project_manager_approved')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'projectManagerApprover:id,name', 'task:id,name', 'attachments'])
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // ACCEPTANCE ITEMS (Hạng mục nghiệm thu)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'acceptance_item'])) {
            $data['acceptance_items'] = AcceptanceItem::where('acceptance_status', 'pending')
                ->whereDate('end_date', '<=', now())
                ->whereHas('acceptanceStage', function($q) use ($canSeeAllProjects, $projectIds) {
                    $q->when(!$canSeeAllProjects, fn($sq) => $sq->whereIn('project_id', $projectIds));
                })
                ->with(['acceptanceStage.project:id,name,code', 'creator:id,name', 'task:id,name'])
                ->orderBy('end_date', 'asc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // CHANGE REQUESTS (Yêu cầu thay đổi)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'change_request'])) {
            $data['change_requests'] = ChangeRequest::whereIn('status', ['submitted', 'under_review', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // ADDITIONAL COSTS (Chi phí phát sinh)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'additional_cost'])) {
            $data['additional_costs'] = AdditionalCost::whereIn('status', ['pending', 'pending_approval', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // SUBCONTRACTOR PAYMENTS (Thanh toán NTP)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'sub_payment'])) {
            $data['sub_payments_management'] = SubcontractorPayment::whereIn('status', ['pending_management_approval', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data['sub_payments_accountant'] = SubcontractorPayment::where('status', 'pending_accountant_confirmation')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // CONTRACTS (Hợp đồng)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'contract'])) {
            $data['contracts'] = Contract::where('status', 'pending_customer_approval')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'attachments'])
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // PROJECT PAYMENTS (Thanh toán dự án)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'payment'])) {
            $data['payments_pending'] = ProjectPayment::where('status', 'customer_pending_approval')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'contract:id,contract_value', 'attachments'])
                ->orderBy('updated_at', 'desc')
                ->get();

            $data['payments_paid'] = ProjectPayment::where('status', 'customer_paid')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'contract:id,contract_value', 'attachments'])
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // MATERIAL BILLS (Phiếu vật tư)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'material_bill'])) {
            $materialBillClass = 'App\\Models\\MaterialBill';
            if (class_exists($materialBillClass)) {
                $data['material_bills_management'] = $materialBillClass::whereIn('status', ['draft', 'pending', 'pending_management', 'rejected'])
                    ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                    ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                $data['material_bills_accountant'] = $materialBillClass::where('status', 'pending_accountant')
                    ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                    ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                    ->orderBy('created_at', 'desc')
                    ->get();
            } else {
                $data['material_bills_management'] = collect();
                $data['material_bills_accountant'] = collect();
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // SUBCONTRACTOR ACCEPTANCES (Nghiệm thu NTP)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'sub_acceptance'])) {
            $data['sub_acceptances'] = SubcontractorAcceptance::where('status', 'pending')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // SUPPLIER ACCEPTANCES (Nghiệm thu NCC)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'supplier_acceptance'])) {
            $data['supplier_acceptances'] = SupplierAcceptance::where('status', 'pending')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['supplier:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // CONSTRUCTION LOGS (Nhật ký công trường)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'construction_log'])) {
            $data['construction_logs'] = ConstructionLog::whereIn('approval_status', ['pending', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
                ->orderBy('log_date', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // SCHEDULE ADJUSTMENTS (Điều chỉnh tiến độ)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'schedule_adjustment'])) {
            $data['schedule_adjustments'] = ScheduleAdjustment::where('status', 'pending')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // DEFECTS (Lỗi chờ xác nhận)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'defect'])) {
            $data['defects'] = Defect::where('status', 'fixed')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'reporter:id,name', 'fixer:id,name', 'task:id,name', 'acceptanceStage:id,name', 'attachments'])
                ->orderBy('fixed_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // PROJECT BUDGETS (Ngân sách dự án)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'budget'])) {
            $data['budgets'] = ProjectBudget::whereIn('status', ['draft', 'pending_approval'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // EQUIPMENT RENTALS (Thuê thiết bị)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'equipment_rental'])) {
            $data['equipment_rentals_management'] = EquipmentRental::whereIn('status', ['pending_management', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data['equipment_rentals_accountant'] = EquipmentRental::where('status', 'pending_accountant')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'approver:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data['equipment_rentals_return'] = EquipmentRental::where('status', 'pending_return')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // ═══════════════════════════════════════════════════════════════
        // ASSET USAGES (Sử dụng thiết bị)
        // ═══════════════════════════════════════════════════════════════
        if ($this->shouldInclude($type, ['all', 'asset_usage'])) {
            $data['asset_usages_management'] = AssetUsage::whereIn('status', ['pending_management', 'rejected'])
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data['asset_usages_accountant'] = AssetUsage::where('status', 'pending_accountant')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'approver:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data['asset_usages_return'] = AssetUsage::where('status', 'pending_return')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

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
        $recentCosts = Cost::whereIn('status', ['approved', 'rejected'])
            ->whereNull('material_bill_id')
            ->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get();

        $recentCR = ChangeRequest::whereIn('status', ['approved', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAC = AdditionalCost::whereIn('status', ['approved', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentSubPayments = SubcontractorPayment::whereIn('status', ['paid', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAcceptances = AcceptanceStage::whereIn('status', ['customer_approved', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentBudgets = ProjectBudget::whereIn('status', ['approved', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentRentals = EquipmentRental::whereIn('status', ['in_use', 'returned', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        $recentUsages = AssetUsage::whereIn('status', ['in_use', 'returned', 'rejected'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'costs' => $recentCosts,
            'change_requests' => $recentCR,
            'additional_costs' => $recentAC,
            'sub_payments' => $recentSubPayments,
            'acceptances' => $recentAcceptances,
            'budgets' => $recentBudgets,
            'equipment_rentals' => $recentRentals,
            'asset_usages' => $recentUsages,
        ];
    }

    // =========================================================================
    // STATS / KPI
    // =========================================================================

    private function getStats($user, bool $canSeeAllProjects, array $projectIds, array $data): array
    {
        $isCustomer = $user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3);

        $realPendingManagement = Cost::whereIn('status', ['pending', 'pending_management_approval'])
            ->whereNull('material_bill_id')->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        $realPendingAccountant = Cost::whereIn('status', ['pending_accountant_approval'])
            ->whereNull('material_bill_id')->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        $realPendingAcceptance = AcceptanceStage::whereIn('status', ['pending', 'supervisor_approved', 'project_manager_approved'])
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        // Count other pending items from already-loaded data
        $pendingOthers = 0;
        if (!$isCustomer) {
            $pendingOthers += ($data['change_requests'] ?? collect())->count();
            $pendingOthers += ($data['additional_costs'] ?? collect())->count();
            $pendingOthers += ($data['sub_payments_management'] ?? collect())->count();
            $pendingOthers += ($data['material_bills_management'] ?? collect())->count();
            $pendingOthers += ($data['equipment_rentals_management'] ?? collect())->count();
            $pendingOthers += ($data['asset_usages_management'] ?? collect())->count();
        }

        $approvedToday = Cost::where('status', 'approved')->whereDate('updated_at', today())
            ->whereNull('material_bill_id')->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        $rejectedToday = Cost::where('status', 'rejected')->whereDate('updated_at', today())
            ->whereNull('material_bill_id')->whereNull('subcontractor_payment_id')
            ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
            ->count();

        $totalPendingAmount = $isCustomer
            ? ProjectPayment::where('status', 'customer_pending_approval')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->sum('amount')
            : Cost::whereIn('status', ['pending', 'pending_management_approval', 'pending_accountant_approval'])
                ->whereNull('material_bill_id')->whereNull('subcontractor_payment_id')
                ->when(!$canSeeAllProjects, fn($q) => $q->whereIn('project_id', $projectIds))
                ->sum('amount');

        return [
            'pending_management' => $isCustomer ? 0 : $realPendingManagement,
            'pending_accountant' => $isCustomer ? 0 : $realPendingAccountant,
            'pending_acceptance' => $realPendingAcceptance,
            'pending_others' => $pendingOthers,
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
            'pending_customer_approval', 'customer_pending_approval' => 'Chờ KH duyệt',
            'project_manager_approved' => 'Chờ KH duyệt',
            'supervisor_approved' => 'Chờ QLDA duyệt',
            'submitted' => 'Đã gửi',
            'under_review' => 'Đang xem xét',
            'approved', 'customer_approved' => 'Đã duyệt',
            'paid', 'customer_paid' => 'Đã thanh toán',
            'rejected' => 'Từ chối',
            'fixed' => 'Đã sửa — Chờ xác nhận',
            'verified' => 'Đã xác nhận',
            'pending_return' => 'Chờ xác nhận trả',
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
}
