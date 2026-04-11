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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApprovalCenterController extends Controller
{
    protected $approvalQueryService;

    public function __construct(ApprovalQueryService $approvalQueryService)
    {
        $this->approvalQueryService = $approvalQueryService;
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

        // Determine user's approval capabilities for 'can_approve' flags
        $canApproveManagement = $user->hasPermission('cost.approve.management') || $user->hasPermission('cost.approve_management');
        $canApproveAccountant = $user->hasPermission('cost.approve.accountant') || $user->hasPermission('cost.approve_accountant');

        // FETCH CENTRALIZED DATA
        $data = $this->approvalQueryService->getApprovalData($user, $type);
        
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
     * Map data to Mobile API format (all categories)
     */
    private function buildMobileItems($data, $type, $canApproveManagement, $canApproveAccountant)
    {
        $items = [];
        
        // 1. Costs (Company & Project)
        $costs = $data['costs_management']->concat($data['costs_accountant'])->unique('id');
        foreach ($costs as $c) {
            if ($type === 'all' || ($type === 'company_cost' && !$c->project_id) || ($type === 'project_cost' && $c->project_id)) {
                $items[] = $this->mapCostToItem($c, $c->project_id ? 'project_cost' : 'company_cost', $canApproveManagement, $canApproveAccountant);
            }
        }

        // 2. Material Bills
        if ($type === 'all' || $type === 'material_bill') {
            foreach ($data['material_bills_management']->concat($data['material_bills_accountant'])->unique('id') as $b) {
                $items[] = [
                    'id' => $b->id, 'type' => 'material_bill', 'title' => 'Vật tư: ' . ($b->bill_number ?? "#{$b->id}"),
                    'subtitle' => $b->project->name ?? 'Dự án', 'amount' => (float) ($b->total_amount ?? 0),
                    'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                    'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                    'project_id' => $b->project_id, 'can_approve' => true,
                    'approval_level' => $b->status === 'pending_accountant' ? 'accountant' : 'management',
                ];
            }
        }

        // 3. Acceptance Stages & Items
        if ($type === 'all' || $type === 'acceptance') {
            $stages = [
                ['coll' => $data['acceptance_supervisor'], 'level' => 'supervisor', 'label' => 'GS duyệt'],
                ['coll' => $data['acceptance_pm'], 'level' => 'project_manager', 'label' => 'QLDA duyệt'],
                ['coll' => $data['acceptance_customer'], 'level' => 'customer', 'label' => 'KH duyệt'],
            ];
            foreach ($stages as $s) {
                foreach ($s['coll'] as $st) {
                    $items[] = [
                        'id' => $st->id, 'type' => 'acceptance', 'title' => 'NT: ' . ($st->task->name ?? 'Công việc'),
                        'subtitle' => $st->project->name ?? 'Dự án', 'amount' => 0,
                        'status' => $st->status, 'status_label' => $s['label'],
                        'created_by' => $st->task->assignee->name ?? ($st->project->projectManager->name ?? 'PM'), 
                        'created_at' => $st->created_at->toISOString(),
                        'project_id' => $st->project_id, 'can_approve' => true, 'approval_level' => $s['level'],
                    ];
                }
            }
        }
        if ($type === 'all' || $type === 'acceptance_item') {
            foreach ($data['acceptance_items'] ?? [] as $ai) {
                $items[] = [
                    'id' => $ai->id, 'type' => 'acceptance_item', 'title' => 'Hạng mục: ' . ($ai->task->name ?? "HM #{$ai->id}"),
                    'subtitle' => $ai->acceptanceStage->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => 'pending', 'status_label' => 'Chờ NT',
                    'created_by' => $ai->creator->name ?? 'N/A', 'created_at' => $ai->created_at->toISOString(),
                    'project_id' => $ai->acceptanceStage->project_id ?? null, 'can_approve' => true, 'approval_level' => 'supervisor',
                ];
            }
        }

        // 4. CR & AC
        if ($type === 'all' || $type === 'change_request') {
            foreach ($data['change_requests'] as $item) {
                $items[] = [
                    'id' => $item->id, 'type' => 'change_request', 'title' => 'CR: ' . $item->title,
                    'subtitle' => $item->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status),
                    'created_by' => $item->requester->name ?? 'N/A', 'created_at' => $item->created_at->toISOString(),
                    'project_id' => $item->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'additional_cost') {
            foreach ($data['additional_costs'] as $item) {
                $items[] = [
                    'id' => $item->id, 'type' => 'additional_cost', 'title' => 'Phát sinh: ' . $item->name,
                    'subtitle' => $item->project->name ?? 'Dự án', 'amount' => (float) $item->amount,
                    'status' => $item->status, 'status_label' => $this->getStatusLabel($item->status),
                    'created_by' => $item->proposer->name ?? 'N/A', 'created_at' => $item->created_at->toISOString(),
                    'project_id' => $item->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }

        // 5. Payments & NTP
        if ($type === 'all' || $type === 'sub_payment') {
            foreach ($data['sub_payments_management']->concat($data['sub_payments_accountant'])->unique('id') as $p) {
                $items[] = [
                    'id' => $p->id, 'type' => 'sub_payment', 'title' => 'TT NTP: ' . ($p->subcontractor->name ?? 'NTP'),
                    'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                    'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                    'created_by' => $p->creator->name ?? 'N/A', 'created_at' => $p->created_at->toISOString(),
                    'project_id' => $p->project_id, 'can_approve' => true, 'approval_level' => str_contains($p->status, 'management') ? 'management' : 'accountant',
                ];
            }
        }
        if ($type === 'all' || $type === 'sub_acceptance') {
            foreach ($data['sub_acceptances'] ?? [] as $sa) {
                $items[] = [
                    'id' => $sa->id, 'type' => 'sub_acceptance', 'title' => 'NT NTP: ' . ($sa->subcontractor->name ?? 'NTP'),
                    'subtitle' => $sa->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $sa->status, 'status_label' => 'Chờ duyệt',
                    'created_by' => $sa->creator->name ?? 'N/A', 'created_at' => $sa->created_at->toISOString(),
                    'project_id' => $sa->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'supplier_acceptance') {
            foreach ($data['supplier_acceptances'] ?? [] as $sa) {
                $items[] = [
                    'id' => $sa->id, 'type' => 'supplier_acceptance', 'title' => 'NT NCC: ' . ($sa->supplier->name ?? 'NCC'),
                    'subtitle' => $sa->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $sa->status, 'status_label' => 'Chờ duyệt',
                    'created_by' => $sa->creator->name ?? 'N/A', 'created_at' => $sa->created_at->toISOString(),
                    'project_id' => $sa->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }

        // 6. Contracts & Project Payments
        if ($type === 'all' || $type === 'contract') {
            foreach ($data['contracts'] as $c) {
                $items[] = [
                    'id' => $c->id, 'type' => 'contract', 'title' => 'HĐ Hướng: ' . ($c->contract_number ?? "#{$c->id}"),
                    'subtitle' => $c->project->name ?? 'Dự án', 'amount' => (float) $c->contract_value,
                    'status' => $c->status, 'status_label' => $this->getStatusLabel($c->status),
                    'created_by' => 'Hệ thống', 'created_at' => $c->updated_at->toISOString(),
                    'project_id' => $c->project_id, 'can_approve' => true, 'approval_level' => 'customer',
                ];
            }
        }
        if ($type === 'all' || $type === 'payment') {
            foreach ($data['payments_pending']->concat($data['payments_paid'])->unique('id') as $p) {
                $items[] = [
                    'id' => $p->id, 'type' => 'payment', 'title' => 'TT Dự án: ' . ($p->payment_name ?? 'Thanh toán'),
                    'subtitle' => $p->project->name ?? 'Dự án', 'amount' => (float) $p->amount,
                    'status' => $p->status, 'status_label' => $this->getStatusLabel($p->status),
                    'created_by' => 'Hệ thống', 'created_at' => $p->updated_at->toISOString(),
                    'project_id' => $p->project_id, 'can_approve' => true, 'approval_level' => $p->status === 'customer_pending_approval' ? 'customer' : 'accountant',
                ];
            }
        }

        // 7. Equipments & Assets
        if ($type === 'all' || $type === 'equipment_rental') {
            foreach ($data['equipment_rentals_management']->concat($data['equipment_rentals_accountant'])->concat($data['equipment_rentals_return'])->unique('id') as $r) {
                $items[] = [
                    'id' => $r->id, 'type' => 'equipment_rental', 'title' => $r->equipment_name ?? "Thuê TB #{$r->id}",
                    'subtitle' => $r->project->name ?? 'Dự án', 'amount' => (float) $r->total_cost,
                    'status' => $r->status, 'status_label' => $this->getStatusLabel($r->status),
                    'created_by' => $r->creator->name ?? 'N/A', 'created_at' => $r->created_at->toISOString(),
                    'project_id' => $r->project_id, 'can_approve' => true, 'approval_level' => str_contains($r->status, 'accountant') ? 'accountant' : 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'asset_usage') {
            foreach ($data['asset_usages_management']->concat($data['asset_usages_accountant'])->concat($data['asset_usages_return'])->unique('id') as $u) {
                $items[] = [
                    'id' => $u->id, 'type' => 'asset_usage', 'title' => 'Sử dụng: ' . ($u->asset->name ?? "TS #{$u->id}"),
                    'subtitle' => $u->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $u->status, 'status_label' => $this->getStatusLabel($u->status),
                    'created_by' => $u->creator->name ?? 'N/A', 'created_at' => $u->created_at->toISOString(),
                    'project_id' => $u->project_id, 'can_approve' => true, 'approval_level' => str_contains($u->status, 'accountant') ? 'accountant' : 'management',
                ];
            }
        }

        // 8. Site Reports & Others
        if ($type === 'all' || $type === 'construction_log') {
            foreach ($data['construction_logs'] ?? [] as $log) {
                $items[] = [
                    'id' => $log->id, 'type' => 'construction_log', 'title' => 'Nhật ký: ' . ($log->log_date ? date('d/m/Y', strtotime($log->log_date)) : "#{$log->id}"),
                    'subtitle' => $log->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $log->approval_status, 'status_label' => $this->getStatusLabel($log->approval_status),
                    'created_by' => $log->creator->name ?? 'GS', 'created_at' => $log->created_at->toISOString(),
                    'project_id' => $log->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'schedule_adjustment') {
            foreach ($data['schedule_adjustments'] ?? [] as $adj) {
                $items[] = [
                    'id' => $adj->id, 'type' => 'schedule_adjustment', 'title' => 'Đ/c tiến độ: ' . ($adj->task->name ?? "CV #{$adj->task_id}"),
                    'subtitle' => $adj->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $adj->status, 'status_label' => 'Chờ duyệt',
                    'created_by' => $adj->creator->name ?? 'N/A', 'created_at' => $adj->created_at->toISOString(),
                    'project_id' => $adj->project_id, 'can_approve' => true, 'approval_level' => 'management',
                ];
            }
        }
        if ($type === 'all' || $type === 'defect') {
            foreach ($data['defects'] ?? [] as $d) {
                $items[] = [
                    'id' => $d->id, 'type' => 'defect', 'title' => 'Lỗi: ' . ($d->name ?? "Lỗi #{$d->id}"),
                    'subtitle' => $d->project->name ?? 'Dự án', 'amount' => 0,
                    'status' => $d->status, 'status_label' => $this->getStatusLabel($d->status),
                    'created_by' => $d->fixer->name ?? 'Kỹ thuật', 'created_at' => $d->updated_at->toISOString(),
                    'project_id' => $d->project_id, 'can_approve' => true, 'approval_level' => 'supervisor',
                ];
            }
        }
        if ($type === 'all' || $type === 'budget') {
            foreach ($data['budgets'] ?? [] as $b) {
                $items[] = [
                    'id' => $b->id, 'type' => 'budget', 'title' => 'Ngân sách: ' . ($b->project->name ?? "Dự án"),
                    'subtitle' => 'Phiên bản ' . $b->version, 'amount' => (float) $b->total_budget,
                    'status' => $b->status, 'status_label' => $this->getStatusLabel($b->status),
                    'created_by' => $b->creator->name ?? 'N/A', 'created_at' => $b->created_at->toISOString(),
                    'project_id' => $b->project_id, 'can_approve' => true, 'approval_level' => 'management',
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
     * Build mobile-specific summary array
     */
    private function buildMobileSummary($data, $type)
    {
        $summary = [];
        $costs = $data['costs_management']->concat($data['costs_accountant'])->unique('id');
        
        if ($costs->isNotEmpty()) {
            $c = $costs->whereNull('project_id');
            if ($c->count() > 0 && ($type === 'all' || $type === 'company_cost')) 
                $summary[] = ['type' => 'company_cost', 'label' => 'Chi phí công ty', 'icon' => 'wallet-outline', 'color' => '#F59E0B', 'total' => $c->count()];
            
            $p = $costs->whereNotNull('project_id');
            if ($p->count() > 0 && ($type === 'all' || $type === 'project_cost')) 
                $summary[] = ['type' => 'project_cost', 'label' => 'Chi phí dự án', 'icon' => 'construct-outline', 'color' => '#3B82F6', 'total' => $p->count()];
        }

        if ($type === 'all' || $type === 'material_bill') {
            $b = $data['material_bills_management']->concat($data['material_bills_accountant'])->unique('id')->count();
            if ($b > 0) $summary[] = ['type' => 'material_bill', 'label' => 'Phiếu vật tư', 'icon' => 'cube-outline', 'color' => '#8B5CF6', 'total' => $b];
        }
        
        if ($type === 'all' || $type === 'acceptance') {
            $a = $data['acceptance_supervisor']->count() + $data['acceptance_pm']->count() + $data['acceptance_customer']->count();
            if ($a > 0) $summary[] = ['type' => 'acceptance', 'label' => 'Nghiệm thu', 'icon' => 'checkmark-circle-outline', 'color' => '#10B981', 'total' => $a];
        }

        // Add more summaries if needed for high-level filtering on mobile
        // but let's keep it clean as per current app design

        return $summary;
    }

    /**
     * Quick approve action directly from approval center.
     * Supports ALL 14 approval types.
     */
    public function quickApprove(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,acceptance_supervisor,acceptance_pm,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance,acceptance_item,construction_log,schedule_adjustment,defect,budget,equipment_rental,asset_usage',
            'id' => 'required|integer',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // ─── RBAC: Check permission before approving ───
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        try {
            DB::beginTransaction();

            switch ($type) {
                // ─── Cost (Company + Project) ───
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($id);

                    if ($cost->status === 'pending_management_approval') {
                        if (!$cost->approveByManagement($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể duyệt'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt chi phí (Ban điều hành)']);
                    }

                    if ($cost->status === 'pending_accountant_approval') {
                        if (!$cost->approveByAccountant($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể xác nhận'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận chi phí (Kế toán)']);
                    }

                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Chi phí không ở trạng thái chờ duyệt'], 400);

                // ─── Material Bill ───
                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (!class_exists($billClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $bill = $billClass::findOrFail($id);

                    if ($bill->status === 'pending_management' && method_exists($bill, 'approveByManagement')) {
                        $bill->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt phiếu vật tư (BĐH)']);
                    }
                    if ($bill->status === 'pending_accountant' && method_exists($bill, 'approveByAccountant')) {
                        $bill->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận phiếu vật tư (KT)']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu không ở trạng thái chờ duyệt'], 400);

                // ─── Acceptance Stage (KH duyệt) ───
                case 'acceptance':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'project_manager_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$stage->approveCustomer($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu (Khách hàng)']);

                // ─── Acceptance Supervisor (GS duyệt) ───
                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ GS duyệt'], 400);
                    }
                    if (!$stage->approveSupervisor($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu (GS)'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'GS đã duyệt nghiệm thu']);

                // ─── Acceptance PM (QLDA duyệt) ───
                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'supervisor_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ QLDA duyệt'], 400);
                    }
                    if (!$stage->approveProjectManager($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu (QLDA)'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'QLDA đã duyệt nghiệm thu']);

                // ─── Change Request ───
                case 'change_request':
                    $cr = ChangeRequest::findOrFail($id);
                    if (!in_array($cr->status, ['submitted', 'under_review'])) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Yêu cầu thay đổi không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$cr->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt yêu cầu thay đổi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt yêu cầu thay đổi']);

                // ─── Additional Cost ───
                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($id);
                    if (!in_array($ac->status, ['pending', 'pending_approval'])) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Chi phí phát sinh không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$ac->approve($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt chi phí phát sinh'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt chi phí phát sinh']);

                // ─── Subcontractor Payment ───
                case 'sub_payment':
                    $sp = SubcontractorPayment::findOrFail($id);
                    if ($sp->status === 'pending_management_approval') {
                        if (!$sp->approve($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể duyệt thanh toán NTP'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt thanh toán NTP (BĐH)']);
                    }
                    if ($sp->status === 'pending_accountant_confirmation') {
                        if (!$sp->markAsPaid($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể xác nhận thanh toán NTP'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận thanh toán NTP (Kế toán)']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Thanh toán NTP không ở trạng thái chờ duyệt'], 400);

                // ─── Contract (KH duyệt) ───
                case 'contract':
                    $contract = Contract::findOrFail($id);
                    if ($contract->status !== 'pending_customer_approval') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Hợp đồng không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$contract->approve($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt hợp đồng'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt hợp đồng']);

                // ─── Project Payment (KH duyệt) ───
                case 'payment':
                    $payment = ProjectPayment::findOrFail($id);
                    if ($payment->status !== 'customer_pending_approval') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Thanh toán không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$payment->approveByCustomer($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt thanh toán'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt đợt thanh toán (Khách hàng)']);

                // ─── Subcontractor Acceptance ───
                case 'sub_acceptance':
                    $sa = SubcontractorAcceptance::findOrFail($id);
                    if ($sa->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu NTP không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$sa->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu NTP'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu NTP']);

                // ─── Supplier Acceptance ───
                case 'supplier_acceptance':
                    $sa = SupplierAcceptance::findOrFail($id);
                    if ($sa->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu NCC không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$sa->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu NCC'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu NCC']);

                // ─── Acceptance Item ───
                case 'acceptance_item':
                    $ai = AcceptanceItem::findOrFail($id);
                    if ($ai->acceptance_status !== 'pending' || !$ai->is_completed) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Hạng mục không ở trạng thái chờ nghiệm thu'], 400);
                    }
                    if (!$ai->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt hạng mục nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu hạng mục']);

                // ─── Construction Log ───
                case 'construction_log':
                    $log = ConstructionLog::findOrFail($id);
                    if ($log->approval_status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nhật ký không ở trạng thái chờ duyệt'], 400);
                    }
                    $log->update([
                        'approval_status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nhật ký công trường']);

                // ─── Schedule Adjustment ───
                case 'schedule_adjustment':
                    $adj = ScheduleAdjustment::findOrFail($id);
                    if ($adj->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Điều chỉnh không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$adj->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt điều chỉnh tiến độ'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt điều chỉnh tiến độ']);

                // ─── Defect Verification ───
                case 'defect':
                    $defect = Defect::findOrFail($id);
                    if ($defect->status !== 'fixed') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Lỗi chưa được báo đã sửa'], 400);
                    }
                    if (!$defect->markAsVerified($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể xác nhận lỗi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã xác nhận lỗi đã sửa']);

                // ─── Project Budget ───
                case 'budget':
                    $budget = ProjectBudget::findOrFail($id);
                    if ($budget->status === 'approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Ngân sách đã được duyệt từ trước'], 400);
                    }
                    $budget->update([
                        'status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt ngân sách dự án']);

                // ─── Equipment Rental ───
                case 'equipment_rental':
                    $rentalClass = 'App\\Models\\EquipmentRental';
                    if (!class_exists($rentalClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $rental = $rentalClass::findOrFail($id);
                    if ($rental->status === 'pending_management' && method_exists($rental, 'approveByManagement')) {
                        $rental->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt thuê thiết bị (BĐH)']);
                    }
                    if ($rental->status === 'pending_accountant' && method_exists($rental, 'approveByAccountant')) {
                        $rental->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận thuê thiết bị (KT)']);
                    }
                    if ($rental->status === 'pending_return' && method_exists($rental, 'confirmReturn')) {
                        $rental->confirmReturn($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận trả thiết bị thuê']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu thuê không ở trạng thái chờ duyệt'], 400);

                // ─── Asset Usage ───
                case 'asset_usage':
                    $usageClass = 'App\\Models\\AssetUsage';
                    if (!class_exists($usageClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $usage = $usageClass::findOrFail($id);
                    if ($usage->status === 'pending_management' && method_exists($usage, 'approveByManagement')) {
                        $usage->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt sử dụng thiết bị (BĐH)']);
                    }
                    if ($usage->status === 'pending_accountant' && method_exists($usage, 'approveByAccountant')) {
                        $usage->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận sử dụng thiết bị (KT)']);
                    }
                    if ($usage->status === 'pending_return' && method_exists($usage, 'confirmReturn')) {
                        $usage->confirmReturn($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận trả thiết bị kho']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu sử dụng TB không ở trạng thái chờ duyệt'], 400);
            }

            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Loại không hợp lệ'], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Quick reject action directly from approval center.
     * Supports ALL 14 approval types.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,acceptance_supervisor,acceptance_pm,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance,acceptance_item,construction_log,schedule_adjustment,defect,budget,equipment_rental,asset_usage',
            'id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();

        // ─── RBAC: Check permission before rejecting ───
        $permCheck = $this->checkApprovalPermission($user, $request->type, $request->id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        try {
            DB::beginTransaction();

            switch ($request->type) {
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($request->id);
                    if (!$cost->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối chi phí']);

                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (!class_exists($billClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $bill = $billClass::findOrFail($request->id);
                    if (method_exists($bill, 'reject')) {
                        $bill->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối phiếu vật tư']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Không thể từ chối'], 400);

                case 'acceptance':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if (!$stage->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu']);

                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if ($stage->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ GS duyệt'], 400);
                    }
                    $stage->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu (GS)']);

                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if ($stage->status !== 'supervisor_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ QLDA duyệt'], 400);
                    }
                    $stage->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu (QLDA)']);

                case 'change_request':
                    $cr = ChangeRequest::findOrFail($request->id);
                    if (!$cr->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối yêu cầu thay đổi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối yêu cầu thay đổi']);

                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($request->id);
                    if (!$ac->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối CP phát sinh'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối chi phí phát sinh']);

                case 'sub_payment':
                    $sp = SubcontractorPayment::findOrFail($request->id);
                    if (!$sp->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối thanh toán NTP'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối thanh toán NTP']);

                case 'contract':
                    $contract = Contract::findOrFail($request->id);
                    $contract->reject($request->reason);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối hợp đồng']);

                case 'payment':
                    $payment = ProjectPayment::findOrFail($request->id);
                    $payment->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối đợt thanh toán']);

                case 'sub_acceptance':
                    $sa = SubcontractorAcceptance::findOrFail($request->id);
                    $sa->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu NTP']);

                case 'supplier_acceptance':
                    $sa = SupplierAcceptance::findOrFail($request->id);
                    $sa->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu NCC']);

                case 'acceptance_item':
                    $ai = AcceptanceItem::findOrFail($request->id);
                    if (!$ai->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối hạng mục'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu hạng mục']);

                case 'construction_log':
                    $log = ConstructionLog::findOrFail($request->id);
                    $log->update([
                        'approval_status' => 'rejected',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nhật ký công trường']);

                case 'schedule_adjustment':
                    $adj = ScheduleAdjustment::findOrFail($request->id);
                    if (!$adj->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối điều chỉnh tiến độ'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối điều chỉnh tiến độ']);

                case 'defect':
                    $defect = Defect::findOrFail($request->id);
                    if ($defect->status !== 'fixed') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Lỗi chưa được báo đã sửa'], 400);
                    }
                    $defect->update([
                        'status' => 'open',
                        'rejected_reason' => $request->reason,
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối xác nhận sửa lỗi']);

                case 'budget':
                    $budget = ProjectBudget::findOrFail($request->id);
                    $budget->update([
                        'status' => 'rejected',
                        'rejected_reason' => $request->reason,
                        'rejected_by' => $user->id,
                        'rejected_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối ngân sách dự án']);

                case 'equipment_rental':
                    $rentalClass = 'App\\Models\\EquipmentRental';
                    if (!class_exists($rentalClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $rental = $rentalClass::findOrFail($request->id);
                    if (method_exists($rental, 'reject')) {
                        $rental->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối thuê thiết bị']);
                    }
                    $rental->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối thuê thiết bị']);

                case 'asset_usage':
                    $usageClass = 'App\\Models\\AssetUsage';
                    if (!class_exists($usageClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $usage = $usageClass::findOrFail($request->id);
                    if (method_exists($usage, 'reject')) {
                        $usage->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối sử dụng thiết bị']);
                    }
                    $usage->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối sử dụng thiết bị']);
            }

            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Loại không hợp lệ'], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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

