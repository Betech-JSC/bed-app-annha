<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\ConstructionLog;
use App\Models\ScheduleAdjustment;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use App\Models\SubcontractorPayment;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Models\Defect;
use App\Models\ProjectBudget;
use App\Models\EquipmentRental;
use App\Models\AssetUsage;
use App\Constants\Permissions;
use App\Services\ApprovalQueryService;
use App\Services\ApprovalActionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApprovalCenterController extends Controller
{
    protected $approvalQueryService;
    protected $approvalActionService;

    public function __construct(
        ApprovalQueryService $approvalQueryService,
        ApprovalActionService $approvalActionService
    ) {
        $this->approvalQueryService = $approvalQueryService;
        $this->approvalActionService = $approvalActionService;
    }

    /**
     * Get all pending approvals for the current user based on their permissions.
     * This is the main "Approval Center" screen data source.
     *
     * Supports filtering by type:
     *   all, company_cost, project_cost, material_bill,
     *   acceptance, change_request, additional_cost,
     *   sub_payment, contract, payment, sub_acceptance, supplier_acceptance
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $type = $request->get('type', 'all');
        $fetchType = in_array($type, ['management', 'accountant', 'project_manager', 'supervisor', 'customer']) ? 'all' : $type;

        // Determine user's approval capabilities for 'can_approve' flags
        $canApproveManagement = $user->hasPermission('cost.approve.management') || $user->hasPermission('cost.approve_management');
        $canApproveAccountant = $user->hasPermission('cost.approve.accountant') || $user->hasPermission('cost.approve_accountant');

        // FETCH CENTRALIZED DATA
        $data = $this->approvalQueryService->getApprovalData($user, $fetchType);
        
        $result = [
            'summary' => [],
            'items' => [],
            'recent_items' => [],
            'stats' => [],
            'grand_total' => 0,
        ];

        // 1. Build Summary Array
        $result['summary'] = $this->buildMobileSummary($data, $type);

        // 2. Build Items Array
        $result['items'] = $this->buildMobileItems($data, $type, $canApproveManagement, $canApproveAccountant);

        // 3. Build Recent Activity (formatted from service)
        $recent = $data['recent'];
        $recentActions = collect([]);
        foreach ($recent['costs'] as $item) $recentActions->push($this->mapCostToItem($item, $item->project_id ? 'project_cost' : 'company_cost', false, false));
        foreach ($recent['change_requests'] as $item) $recentActions->push(['id' => $item->id, 'type' => 'change_request', 'title' => 'CR: ' . $item->title, 'subtitle' => $item->project->name ?? 'Dự án', 'amount' => 0, 'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status), 'created_at' => $item->updated_at->toISOString(), 'approval_level' => 'history']);
        foreach ($recent['acceptances'] as $item) $recentActions->push(['id' => $item->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($item->task->name ?? 'Công việc'), 'subtitle' => $item->project->name ?? 'Dự án', 'amount' => 0, 'status' => $item->status, 'status_label' => 'Đã duyệt', 'created_at' => $item->updated_at->toISOString(), 'approval_level' => 'history']);
        
        $result['recent_items'] = $recentActions->sortByDesc('created_at')->values()->all();

        // 4. Stats Overview
        $stats = $data['stats'];
        $result['stats'] = [
            'pending_total' => array_sum(array_column($result['summary'], 'total')),
            'pending_amount' => (float) $stats['total_pending_amount'],
            'approved_today' => (int) $stats['approved_today'],
            'rejected_today' => (int) $stats['rejected_today'],
        ];

        // 5. Post-processing (Injecting role info, sorting, etc.)
        foreach ($result['items'] as &$item) {
            $item = array_merge($item, $this->getRequiredRoleInfo($item['approval_level'] ?? 'management'));
        }
        foreach ($result['recent_items'] as &$item) {
            $item = array_merge($item, $this->getRequiredRoleInfo($item['approval_level'] ?? 'history'));
        }
        unset($item);

        usort($result['items'], fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
        $result['grand_total'] = $result['stats']['pending_total'];
        $result['user_roles'] = $user->roles->pluck('name')->toArray();

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Map data to Mobile API format (grouped by Role Buckets)
     */
    private function buildMobileItems($data, $type, $canApproveManagement, $canApproveAccountant)
    {
        $items = [];
        
        // --- 1. MANAGEMENT BUCKET (Ban điều hành) ---
        // Project costs pending mgmt
        foreach ($data['costs_management']->whereNotNull('project_id') as $c) {
            if ($type === 'all' || $type === 'management' || $type === 'project_cost') {
                $items[] = array_merge($this->mapCostToItem($c, 'project_cost', $canApproveManagement, false), ['role_group' => 'management']);
            }
        }
        // Company costs pending mgmt
        foreach ($data['costs_management']->whereNull('project_id') as $c) {
            if ($type === 'all' || $type === 'management' || $type === 'company_cost') {
                $items[] = array_merge($this->mapCostToItem($c, 'company_cost', $canApproveManagement, false), ['role_group' => 'management']);
            }
        }
        // Material Bills (mgmt)
        if ($type === 'all' || $type === 'management' || $type === 'material_bill') {
            foreach ($data['material_bills_management']->unique('id') as $b) {
                $items[] = [
                    'id' => $b->id, 'type' => 'material_bill', 'title' => 'Vật tư: ' . ($b->bill_number ?? "#{$b->id}"),
                    'subtitle' => $b->project->name ?? 'Dự án', 'amount' => (float) ($b->total_amount ?? 0),
                    'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                    'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                    'project_id' => $b->project_id, 'can_approve' => true,
                    'approval_level' => 'management', 'role_group' => 'management',
                ];
            }
        }
        // CR, AC, Budgets, Sub Acceptances
        if ($type === 'all' || $type === 'management' || $type === 'change_request') {
            foreach ($data['change_requests'] as $item) {
                $items[] = [
                    'id' => $item->id, 'type' => 'change_request', 'title' => 'CR: ' . $item->title,
                    'subtitle' => $item->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status),
                    'created_by' => $item->requester->name ?? 'N/A', 'created_at' => $item->created_at->toISOString(),
                    'project_id' => $item->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'management' || $type === 'additional_cost') {
            foreach ($data['additional_costs'] as $item) {
                $items[] = [
                    'id' => $item->id, 'type' => 'additional_cost', 'title' => 'Phát sinh: ' . $item->name,
                    'subtitle' => $item->project->name ?? 'Dự án', 'amount' => (float) $item->amount,
                    'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status),
                    'created_by' => $item->proposer->name ?? 'N/A', 'created_at' => $item->created_at->toISOString(),
                    'project_id' => $item->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'management',
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
                    'project_id' => $b->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'management',
                ];
            }
        }
        // Sub/Supplier Acceptances (typically mgmt)
        if ($type === 'all' || $type === 'management' || $type === 'sub_acceptance') {
            foreach ($data['sub_acceptances'] ?? [] as $sa) {
                $items[] = [
                    'id' => $sa->id, 'type' => 'sub_acceptance', 'title' => 'NT NTP: ' . ($sa->subcontractor->name ?? 'NTP'),
                    'subtitle' => $sa->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $sa->status, 'status_label' => 'Chờ duyệt',
                    'created_by' => $sa->creator->name ?? 'N/A', 'created_at' => $sa->created_at->toISOString(),
                    'project_id' => $sa->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'management'
                ];
            }
        }

        // --- 2. ACCOUNTANT BUCKET (Kế toán) ---
        foreach ($data['costs_accountant'] as $c) {
            if ($type === 'all' || $type === 'accountant' || $type === 'project_cost' || $type === 'company_cost') {
                $items[] = array_merge($this->mapCostToItem($c, $c->project_id ? 'project_cost' : 'company_cost', false, $canApproveAccountant), ['role_group' => 'accountant']);
            }
        }
        if ($type === 'all' || $type === 'accountant' || $type === 'material_bill') {
            foreach ($data['material_bills_accountant']->unique('id') as $b) {
                $items[] = [
                    'id' => $b->id, 'type' => 'material_bill', 'title' => 'Vật tư: ' . ($b->bill_number ?? "#{$b->id}"),
                    'subtitle' => $b->project->name ?? 'Dự án', 'amount' => (float) ($b->total_amount ?? 0),
                    'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                    'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                    'project_id' => $b->project_id, 'can_approve' => true,
                    'approval_level' => 'accountant', 'role_group' => 'accountant'
                ];
            }
        }
        if ($type === 'all' || $type === 'accountant' || $type === 'sub_payment') {
            foreach ($data['sub_payments_management']->concat($data['sub_payments_accountant'])->unique('id') as $p) {
                $level = str_contains($p->status, 'management') ? 'management' : 'accountant';
                if ($type === 'all' || $type === $level || $type === 'sub_payment') {
                    $items[] = [
                        'id' => $p->id, 'type' => 'sub_payment', 'title' => 'TT NTP: ' . ($p->subcontractor->name ?? 'NTP'),
                        'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                        'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                        'created_by' => $p->creator->name ?? 'N/A', 'created_at' => $p->created_at->toISOString(),
                        'project_id' => $p->project_id, 'can_approve' => true, 'approval_level' => $level, 'role_group' => $level === 'management' ? 'management' : 'accountant'
                    ];
                }
            }
        }

        // --- 3. PROJECT MANAGER BUCKET (QLDA) ---
        if ($type === 'all' || $type === 'project_manager' || $type === 'acceptance') {
            foreach ($data['acceptance_pm'] as $st) {
                $items[] = [
                    'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                    'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $st->status, 'status_label' => 'QLDA duyệt',
                    'created_by' => $st->task->assignee->name ?? ($st->project->projectManager->name ?? 'PM'), 
                    'created_at' => $st->created_at->toISOString(),
                    'project_id' => $st->project_id, 'can_approve' => true, 'approval_level' => 'project_manager', 'role_group' => 'project_manager'
                ];
            }
        }
        if ($type === 'all' || $type === 'project_manager' || $type === 'schedule_adjustment') {
            foreach ($data['schedule_adjustments'] ?? [] as $adj) {
                $items[] = [
                    'id' => $adj->id, 'type' => 'schedule_adjustment', 'title' => 'Đ/c tiến độ: ' . ($adj->task->name ?? "CV #{$adj->task_id}"),
                    'subtitle' => $adj->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $adj->status, 'status_label' => 'Chờ duyệt',
                    'created_by' => $adj->creator->name ?? 'N/A', 'created_at' => $adj->created_at->toISOString(),
                    'project_id' => $adj->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'project_manager'
                ];
            }
        }
        if ($type === 'all' || $type === 'project_manager' || $type === 'construction_log') {
            foreach ($data['construction_logs'] ?? [] as $log) {
                $items[] = [
                    'id' => $log->id, 'type' => 'construction_log', 'title' => 'Nhật ký: ' . ($log->log_date ? date('d/m/Y', strtotime($log->log_date)) : "#{$log->id}"),
                    'subtitle' => $log->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $log->approval_status, 'status_label' => $this->getStatusLabel($log->approval_status),
                    'created_by' => $log->creator->name ?? 'GS', 'created_at' => $log->created_at->toISOString(),
                    'project_id' => $log->project_id, 'can_approve' => true, 'approval_level' => 'management', 'role_group' => 'project_manager'
                ];
            }
        }

        // --- 4. SUPERVISOR BUCKET (Giám sát) ---
        if ($type === 'all' || $type === 'supervisor' || $type === 'acceptance') {
            foreach ($data['acceptance_supervisor'] as $st) {
                $items[] = [
                    'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                    'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $st->status, 'status_label' => 'GS duyệt',
                    'created_by' => $st->task->assignee->name ?? 'NV', 
                    'created_at' => $st->created_at->toISOString(),
                    'project_id' => $st->project_id, 'can_approve' => true, 'approval_level' => 'supervisor', 'role_group' => 'supervisor'
                ];
            }
        }
        if ($type === 'all' || $type === 'supervisor' || $type === 'acceptance_item') {
            foreach ($data['acceptance_items'] ?? [] as $ai) {
                $items[] = [
                    'id' => $ai->id, 'type' => 'acceptance_item', 'title' => 'Hạng mục: ' . ($ai->task->name ?? "HM #{$ai->id}"),
                    'subtitle' => $ai->acceptanceStage->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => 'pending', 'status_label' => 'Chờ NT',
                    'created_by' => $ai->creator->name ?? 'N/A', 'created_at' => $ai->created_at->toISOString(),
                    'project_id' => $ai->acceptanceStage->project_id ?? null, 'can_approve' => true, 'approval_level' => 'supervisor', 'role_group' => 'supervisor'
                ];
            }
        }
        if ($type === 'all' || $type === 'supervisor' || $type === 'defect') {
            foreach ($data['defects'] ?? [] as $d) {
                $items[] = [
                    'id' => $d->id, 'type' => 'defect', 'title' => 'Lỗi: ' . ($d->name ?? "Lỗi #{$d->id}"),
                    'subtitle' => $d->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $d->status, 'status_label' => $this->getStatusLabel($d->status),
                    'created_by' => $d->fixer->name ?? 'Kỹ thuật', 'created_at' => $d->updated_at->toISOString(),
                    'project_id' => $d->project_id, 'can_approve' => true, 'approval_level' => 'supervisor', 'role_group' => 'supervisor'
                ];
            }
        }

        // --- 5. CUSTOMER BUCKET (Khách hàng) ---
        if ($type === 'all' || $type === 'customer' || $type === 'acceptance') {
            foreach ($data['acceptance_customer'] as $st) {
                $items[] = [
                    'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                    'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $st->status, 'status_label' => 'KH duyệt',
                    'created_by' => $st->project->projectManager->name ?? 'PM', 
                    'created_at' => $st->created_at->toISOString(),
                    'project_id' => $st->project_id, 'can_approve' => true, 'approval_level' => 'customer', 'role_group' => 'customer'
                ];
            }
        }
        if ($type === 'all' || $type === 'customer' || $type === 'contract') {
            foreach ($data['contracts'] as $c) {
                $items[] = [
                    'id' => $c->id, 'type' => 'contract', 'title' => 'HĐ Hướng: ' . ($c->contract_number ?? "#{$c->id}"),
                    'subtitle' => $c->project->name ?? 'Dự án', 'amount' => (float) $c->contract_value,
                    'status' => $c->status, 'status_label' => $this->getStatusLabel($c->status),
                    'created_by' => 'Hệ thống', 'created_at' => $c->updated_at->toISOString(),
                    'project_id' => $c->project_id, 'can_approve' => true, 'approval_level' => 'customer', 'role_group' => 'customer'
                ];
            }
        }
        if ($type === 'all' || $type === 'customer' || $type === 'payment') {
            foreach ($data['payments_pending']->unique('id') as $p) {
                $items[] = [
                    'id' => $p->id, 'type' => 'payment', 'title' => 'TT Dự án: ' . ($p->payment_name ?? 'Thanh toán'),
                    'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                    'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                    'created_by' => 'Hệ thống', 'created_at' => $p->updated_at->toISOString(),
                    'project_id' => $p->project_id, 'can_approve' => true, 'approval_level' => 'customer', 'role_group' => 'customer'
                ];
            }
        }

        // Equipment/Assets (typically management or accountant)
        if ($type === 'all' || $type === 'equipment_rental') {
            foreach ($data['equipment_rentals_management']->concat($data['equipment_rentals_accountant'])->concat($data['equipment_rentals_return'])->unique('id') as $r) {
                $level = str_contains($r->status, 'accountant') ? 'accountant' : 'management';
                $items[] = [
                    'id' => $r->id, 'type' => 'equipment_rental', 'title' => $r->equipment_name ?? "Thuê TB #{$r->id}",
                    'subtitle' => $r->project->name ?? 'Dự án', 'amount' => (float) $r->total_cost,
                    'status' => $r->status, 'status_label' => $this->getStatusLabel($r->status),
                    'created_by' => $r->creator->name ?? 'N/A', 'created_at' => $r->created_at->toISOString(),
                    'project_id' => $r->project_id, 'can_approve' => true, 'approval_level' => $level, 'role_group' => $level
                ];
            }
        }

        return $items;
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
        ];
    }

    /**
     * Build mobile-specific summary array (by Role Group)
     */
    private function buildMobileSummary($data, $currentType)
    {
        // 1. Calculate counts for each role group
        $counts = [
            'management' => 0,
            'accountant' => 0,
            'project_manager' => 0,
            'supervisor' => 0,
            'customer' => 0,
        ];

        // This ensures exact counts matching buildMobileItems
        $items = $this->buildMobileItems($data, 'all', true, true);
        foreach ($items as $it) {
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
        ];

        foreach ($groups as $g) {
            if ($counts[$g['type']] > 0) {
                $summary[] = array_merge($g, ['total' => $counts[$g['type']]]);
            }
        }

        return $summary;
    }

    /**
     * Quick approve action directly from approval center.
     * Supports ALL 14 approval types.
     */
    public function quickApprove(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // ─── RBAC: Check permission before approving ───
        // Pass the RAW type to perm check as it needs to see 'project_cost' etc. to check the right statuses
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        // ─── Service Type Mapping ───
        // Map APP-specific types to Service-compatible types based on current status
        $serviceType = $type;
        if ($type === 'project_cost' || $type === 'company_cost') {
            $cost = \App\Models\Cost::findOrFail($id);
            $serviceType = ($cost->status === 'pending_accountant_approval') ? 'accountant' : 'management';
        } elseif ($type === 'equipment_rental') {
            $rental = \App\Models\EquipmentRental::findOrFail($id);
            if ($rental->status === 'pending_management') $serviceType = 'equipment_rental_management';
            elseif ($rental->status === 'pending_accountant') $serviceType = 'equipment_rental_accountant';
            elseif ($rental->status === 'pending_return') $serviceType = 'equipment_rental_return';
        } elseif ($type === 'asset_usage') {
            $usage = \App\Models\AssetUsage::findOrFail($id);
            if ($usage->status === 'pending_management') $serviceType = 'asset_usage_management';
            elseif ($usage->status === 'pending_accountant') $serviceType = 'asset_usage_accountant';
            elseif ($usage->status === 'pending_return') $serviceType = 'asset_usage_return';
        } elseif ($type === 'sub_payment') {
            $p = \App\Models\SubcontractorPayment::findOrFail($id);
            $serviceType = ($p->status === 'pending_accountant_confirmation') ? 'sub_payment_confirm' : 'sub_payment';
        } elseif ($type === 'payment') {
            $p = \App\Models\ProjectPayment::findOrFail($id);
            $serviceType = ($p->status === 'accountant_pending_confirmation') ? 'project_payment_confirm' : 'project_payment';
        }

        $result = $this->approvalActionService->approve($user, $serviceType, $id, ['notes' => $request->notes]);

        if ($result['success']) {
            return response()->json(['success' => true, 'message' => $result['message']]);
        }
        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }


    /**
     * Quick reject action directly from approval center.
     * Supports ALL 14 approval types.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // ─── RBAC: Check permission before rejecting ───
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        // ─── Service Type Mapping ───
        $serviceType = $type;
        if ($type === 'project_cost' || $type === 'company_cost') {
            $cost = \App\Models\Cost::findOrFail($id);
            $serviceType = ($cost->status === 'pending_accountant_approval') ? 'accountant' : 'management';
        } elseif ($type === 'equipment_rental') {
            $serviceType = 'equipment_rental_management'; // Rental reject is usually a single state
        } elseif ($type === 'asset_usage') {
            $serviceType = 'asset_usage_management';
        } elseif ($type === 'payment') {
            $serviceType = 'project_payment';
        }

        $result = $this->approvalActionService->reject($user, $serviceType, $id, $request->reason);

        if ($result['success']) {
            return response()->json(['success' => true, 'message' => $result['message']]);
        }
        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }

    /**
     * RBAC: Check if user has the correct permission for the given approval type.
     * Returns true if allowed, or a JsonResponse (403) if not.
     *
     * @param \App\Models\User $user
     * @param string $type  Approval type key
     * @param int $id       Item ID (used for status-dependent checks like costs)
     * @return true|\Illuminate\Http\JsonResponse
     */
    private function checkApprovalPermission($user, string $type, int $id)
    {
        // Owner (super admin flag) bypasses all checks
        if ($user->owner || $user->isSuperAdmin()) {
            return true;
        }

        // Project-based filtering for relevant types
        $projectIds = $user->projects()->pluck('projects.id')->toArray();

        // ─── Project Assignment Check ───
        $modelMap = [
            'project_cost' => Cost::class,
            'material_bill' => 'App\\Models\\MaterialBill',
            'acceptance' => AcceptanceStage::class,
            'acceptance_supervisor' => AcceptanceStage::class,
            'acceptance_pm' => AcceptanceStage::class,
            'change_request' => ChangeRequest::class,
            'additional_cost' => AdditionalCost::class,
            'sub_payment' => SubcontractorPayment::class,
            'contract' => Contract::class,
            'payment' => ProjectPayment::class,
            'sub_acceptance' => SubcontractorAcceptance::class,
            'supplier_acceptance' => SupplierAcceptance::class,
            'acceptance_item' => AcceptanceItem::class,
            'construction_log' => ConstructionLog::class,
            'schedule_adjustment' => ScheduleAdjustment::class,
            'defect' => Defect::class,
            'budget' => ProjectBudget::class,
            'equipment_rental' => EquipmentRental::class,
            'asset_usage' => AssetUsage::class,
        ];

        if (isset($modelMap[$type])) {
            $modelClass = $modelMap[$type];
            if (class_exists($modelClass)) {
                $item = $modelClass::find($id);
                if ($item) {
                     $pid = null;
                     if (isset($item->project_id)) {
                         $pid = $item->project_id;
                     } elseif ($type === 'acceptance_item' && $item->acceptanceStage) {
                         $pid = $item->acceptanceStage->project_id;
                     }

                     if ($pid !== null && !in_array($pid, $projectIds)) {
                         return response()->json([
                             'success' => false,
                             'message' => 'Bạn không được phân công vào dự án này.'
                         ], 403);
                     }
                }
            }
        }

        switch ($type) {
            case 'company_cost':
            case 'project_cost':
                $cost = Cost::find($id);
                if ($cost && $cost->status === 'pending_management_approval') {
                    if (!$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).'
                        ], 403);
                    }
                } elseif ($cost && $cost->status === 'pending_accountant_approval') {
                    if (!$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).'
                        ], 403);
                    }
                }
                break;

            case 'material_bill':
                if (!$user->hasPermission(Permissions::MATERIAL_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt phiếu vật tư.'
                    ], 403);
                }
                break;

            case 'acceptance':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (Khách hàng).'
                    ], 403);
                }
                break;

            case 'acceptance_supervisor':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (Giám sát).'
                    ], 403);
                }
                break;

            case 'acceptance_pm':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (QLDA).'
                    ], 403);
                }
                break;

            case 'change_request':
                if (!$user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt yêu cầu thay đổi.'
                    ], 403);
                }
                break;

            case 'additional_cost':
                if (!$user->hasPermission(Permissions::ADDITIONAL_COST_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt chi phí phát sinh.'
                    ], 403);
                }
                break;

            case 'sub_payment':
                $sp = SubcontractorPayment::find($id);
                if ($sp && $sp->status === 'pending_management_approval') {
                    if (!$user->hasPermission(Permissions::SUBCONTRACTOR_PAYMENT_APPROVE)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền duyệt thanh toán NTP.'
                        ], 403);
                    }
                } elseif ($sp && $sp->status === 'pending_accountant_confirmation') {
                    if (!$user->hasPermission(Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền xác nhận thanh toán NTP (Kế toán).'
                        ], 403);
                    }
                }
                break;

            case 'contract':
                if (!$user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt hợp đồng.'
                    ], 403);
                }
                break;

            case 'payment':
                if (!$user->hasPermission(Permissions::PAYMENT_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt thanh toán dự án.'
                    ], 403);
                }
                break;

            case 'sub_acceptance':
                if (!$user->hasPermission(Permissions::SUPPLIER_ACCEPTANCE_VIEW)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu NTP.'
                    ], 403);
                }
                break;

            case 'supplier_acceptance':
                if (!$user->hasPermission(Permissions::SUPPLIER_ACCEPTANCE_VIEW)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu NCC.'
                    ], 403);
                }
                break;

            case 'acceptance_item':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt hạng mục nghiệm thu.'
                    ], 403);
                }
                break;

            case 'construction_log':
                if (!$user->hasPermission(Permissions::LOG_UPDATE)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nhật ký công trường.'
                    ], 403);
                }
                break;

            case 'schedule_adjustment':
                if (!$user->hasPermission(Permissions::GANTT_UPDATE)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt điều chỉnh tiến độ.'
                    ], 403);
                }
                break;

            case 'defect':
                if (!$user->hasPermission(Permissions::DEFECT_VERIFY)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền xác nhận sửa lỗi.'
                    ], 403);
                }
                break;

            case 'budget':
                if (!$user->hasPermission(Permissions::BUDGET_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt ngân sách.'
                    ], 403);
                }
                break;

            case 'equipment_rental':
            case 'asset_usage':
                if (!$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)
                    && !$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt thiết bị.'
                    ], 403);
                }
                break;
        }

        return true;
    }

    private function getStatusLabel(string $status): string
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
            'fixed' => 'Đã sửa - Chờ xác nhận',
            'pending_return' => 'Chờ xác nhận trả',
            default => $status,
        };
    }

    /**
     * Map approval_level to the required role(s) and display labels.
     * This helps the APP show which role is needed for each approval item.
     */
    private function getRequiredRoleInfo(string $approvalLevel): array
    {
        return match ($approvalLevel) {
            'management' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Giám đốc / Ban ĐH',
                'required_role_short' => 'GĐ',
                'required_role_icon' => 'ribbon-outline',
                'required_role_color' => '#F97316',
            ],
            'accountant' => [
                'required_role' => 'accountant',
                'required_role_label' => 'Kế toán',
                'required_role_short' => 'KT',
                'required_role_icon' => 'calculator-outline',
                'required_role_color' => '#06B6D4',
            ],
            'customer' => [
                'required_role' => 'client',
                'required_role_label' => 'Khách hàng / Chủ ĐT',
                'required_role_short' => 'KH',
                'required_role_icon' => 'people-outline',
                'required_role_color' => '#10B981',
            ],
            'supervisor' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#0D9488',
            ],
            'project_manager' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'person-outline',
                'required_role_color' => '#3B82F6',
            ],
            'change_request' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'person-outline',
                'required_role_color' => '#3B82F6',
            ],
            'additional_cost' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý / Ban ĐH',
                'required_role_short' => 'QL',
                'required_role_icon' => 'briefcase-outline',
                'required_role_color' => '#F97316',
            ],
            'sub_acceptance' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#0D9488',
            ],
            'supplier_acceptance' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#84CC16',
            ],
            'acceptance_item' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'clipboard-outline',
                'required_role_color' => '#14B8A6',
            ],
            'construction_log' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'newspaper-outline',
                'required_role_color' => '#A855F7',
            ],
            'schedule_adjustment' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý / Ban ĐH',
                'required_role_short' => 'QL',
                'required_role_icon' => 'calendar-outline',
                'required_role_color' => '#E11D48',
            ],
            'defect_verify' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'bug-outline',
                'required_role_color' => '#F43F5E',
            ],
            'equipment_rental' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Ban ĐH / Kế toán',
                'required_role_short' => 'BĐH',
                'required_role_icon' => 'construct-outline',
                'required_role_color' => '#06B6D4',
            ],
            'asset_usage' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Ban ĐH / Kế toán',
                'required_role_short' => 'BĐH',
                'required_role_icon' => 'hardware-chip-outline',
                'required_role_color' => '#3B82F6',
            ],
            default => [
                'required_role' => 'admin',
                'required_role_label' => 'Quản trị',
                'required_role_short' => 'QT',
                'required_role_icon' => 'shield-outline',
                'required_role_color' => '#6B7280',
            ],
        };
    }
}

