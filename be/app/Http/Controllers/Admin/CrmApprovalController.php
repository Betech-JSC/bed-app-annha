<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\Cost;
use App\Models\Acceptance;
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
use App\Services\AttendanceService;
use App\Models\User;
use App\Services\ApprovalQueryService;
use App\Services\ApprovalActionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CrmApprovalController extends Controller
{
    use CrmAuthorization;

    protected $approvalQueryService;
    protected $approvalActionService;
    protected $attendanceService;

    public function __construct(
        ApprovalQueryService $approvalQueryService,
        ApprovalActionService $approvalActionService,
        AttendanceService $attendanceService
    ) {
        $this->approvalQueryService = $approvalQueryService;
        $this->approvalActionService = $approvalActionService;
        $this->attendanceService = $attendanceService;
    }

    /**
     * Display the Approval Center page — grouped by approval level.
     */
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $data = $this->approvalQueryService->getApprovalData($user);

        // 1. Determine user permissions once
        $userPermissions = [
            'can_management' => $this->crmCan($user, Permissions::COST_APPROVE_MANAGEMENT),
            'can_accountant' => ($this->crmCan($user, Permissions::COST_APPROVE_ACCOUNTANT) || $this->crmCan($user, Permissions::PAYMENT_CONFIRM)),
            'can_pm' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2),
            'can_supervisor' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1),
            'can_customer' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $this->crmCan($user, Permissions::PAYMENT_APPROVE),
            'can_hr' => $this->crmCan($user, Permissions::ATTENDANCE_APPROVE),
        ];

        // 2. Pre-process defects by role
        $defectsByRole = ['supervisor' => collect([]), 'project_manager' => collect([]), 'customer' => collect([])];
        foreach ($data['defects'] as $defect) {
            $formatted = array_merge($this->formatDefectItem($defect), ['_approveType' => 'defect_verify']);
            $targetRole = 'supervisor';
            if ($defect->acceptanceStage) {
                // 2-cấp flow: GS xác nhận xong → KH duyệt (bỏ QLDA).
                if ($defect->acceptanceStage->status === 'supervisor_approved') $targetRole = 'customer';
            }
            $defectsByRole[$targetRole]->push($formatted);
        }

        // 3. Populate role groups dynamically
        $roleGroups = [
            'management' => $userPermissions['can_management'] ? collect([])
                ->concat($data['costs_management']->map(fn($i) => array_merge($this->formatItem($i), ['_approveType' => 'management'])))
                ->concat($data['additional_costs']->map(fn($i) => array_merge($this->formatAdditionalCostItem($i), ['_approveType' => 'additional_cost'])))
                ->concat($data['sub_payments_management']->map(fn($i) => array_merge($this->formatSubPaymentItem($i), ['_approveType' => 'sub_payment'])))
                ->concat($data['material_bills_management']->map(fn($i) => array_merge($this->formatMaterialBillItem($i), ['_approveType' => 'material_bill'])))
                ->concat($data['budgets']->map(fn($i) => array_merge($this->formatBudget($i), ['_approveType' => 'budget'])))
                ->concat($data['equipment_rentals_management']->map(fn($i) => array_merge($this->formatEquipmentRentalItem($i), ['_approveType' => 'equipment_rental_management'])))
                ->concat($data['asset_usages_management']->map(fn($i) => array_merge($this->formatAssetUsageItem($i), ['_approveType' => 'asset_usage_management'])))
                ->concat(($data['equipment_purchases_management'] ?? collect([]))->map(fn($i) => array_merge($this->formatEquipmentPurchaseItem($i), ['_approveType' => 'equipment_purchase_management'])))
                ->concat(($data['equipment_inventory_management'] ?? collect([]))->map(fn($i) => array_merge($this->formatEquipmentInventoryItem($i), ['_approveType' => 'equipment_inventory_management'])))
                ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->values() : collect([]),

            'accountant' => $userPermissions['can_accountant'] ? collect([])
                ->concat($data['costs_accountant']->map(fn($i) => array_merge($this->formatItem($i), ['_approveType' => 'accountant'])))
                ->concat($data['sub_payments_accountant']->map(fn($i) => array_merge($this->formatSubPaymentItem($i), ['_approveType' => 'sub_payment_confirm'])))
                ->concat($data['payments_paid']->map(fn($i) => array_merge($this->formatPaymentItem($i), ['_approveType' => 'project_payment_confirm'])))
                ->concat($data['material_bills_accountant']->map(fn($i) => array_merge($this->formatMaterialBillItem($i), ['_approveType' => 'material_bill'])))
                ->concat($data['equipment_rentals_accountant']->map(fn($i) => array_merge($this->formatEquipmentRentalItem($i), ['_approveType' => 'equipment_rental_accountant'])))
                ->concat($data['asset_usages_accountant']->map(fn($i) => array_merge($this->formatAssetUsageItem($i), ['_approveType' => 'asset_usage_accountant'])))
                ->concat(($data['equipment_purchases_accountant'] ?? collect([]))->map(fn($i) => array_merge($this->formatEquipmentPurchaseItem($i), ['_approveType' => 'equipment_purchase_accountant'])))
                ->concat(($data['equipment_inventory_accountant'] ?? collect([]))->map(fn($i) => array_merge($this->formatEquipmentInventoryItem($i), ['_approveType' => 'equipment_inventory_accountant'])))
                ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->values() : collect([]),

            'project_manager' => $userPermissions['can_pm'] ? collect([])
                ->concat($data['acceptance_pm']->map(fn($i) => array_merge($this->formatAcceptanceItem($i, 'Chờ QLDA duyệt', 'project_manager'), ['_approveType' => 'acceptance_pm'])))
                ->concat($data['change_requests']->map(fn($i) => array_merge($this->formatChangeRequestItem($i), ['_approveType' => 'change_request'])))
                // construction_logs removed — BUSINESS RULE: Nhật ký không cần duyệt
                ->concat($data['schedule_adjustments']->map(fn($i) => array_merge($this->formatScheduleAdjustmentItem($i), ['_approveType' => 'schedule_adjustment'])))
                ->concat($data['equipment_rentals_return']->map(fn($i) => array_merge($this->formatEquipmentRentalItem($i), ['_approveType' => 'equipment_rental_return'])))
                ->concat($data['asset_usages_return']->map(fn($i) => array_merge($this->formatAssetUsageItem($i), ['_approveType' => 'asset_usage_return'])))
                ->concat(($data['equipment_purchases_return'] ?? collect([]))->map(fn($i) => array_merge($this->formatEquipmentPurchaseItem($i), ['_approveType' => 'equipment_purchase_return']))) // In case there is a return flow in the future
                ->concat($defectsByRole['project_manager'])
                ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->values() : collect([]),

            'supervisor' => $userPermissions['can_supervisor'] ? collect([])
                ->concat($data['acceptance_supervisor']->map(fn($i) => array_merge($this->formatAcceptanceItem($i, 'Chờ GS duyệt', 'supervisor'), ['_approveType' => 'acceptance_supervisor'])))
                ->concat($data['sub_acceptances']->map(fn($i) => array_merge($this->formatSubAcceptanceItem($i), ['_approveType' => 'sub_acceptance'])))
                ->concat($data['supplier_acceptances']->map(fn($i) => array_merge($this->formatSupplierAcceptanceItem($i), ['_approveType' => 'supplier_acceptance'])))
                ->concat($defectsByRole['supervisor'])
                ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->values() : collect([]),

            'customer' => $userPermissions['can_customer'] ? collect([])
                ->concat($data['acceptance_customer']->map(fn($i) => array_merge($this->formatAcceptanceItem($i, 'Chờ KH duyệt', 'customer'), ['_approveType' => 'acceptance'])))
                ->concat($data['contracts']->map(fn($i) => array_merge($this->formatContractItem($i), ['_approveType' => 'contract'])))
                ->concat($data['payments_pending']->map(fn($i) => array_merge($this->formatPaymentItem($i), ['_approveType' => 'project_payment'])))
                ->concat($data['maintenances']->map(fn($i) => array_merge($this->formatMaintenanceItem($i), ['_approveType' => 'maintenance'])))
                ->concat($data['warranties']->map(fn($i) => array_merge($this->formatWarrantyItem($i), ['_approveType' => 'warranty'])))
                ->concat($defectsByRole['customer'])
                ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->values() : collect([]),

            'hr' => $userPermissions['can_hr'] ? ($data['attendances_pending'] ?? collect([]))->map(fn($i) => array_merge($this->formatAttendanceItem($i), ['_approveType' => 'attendance']))->values() : collect([]),
        ];

        // 4. Budget Mapping for Accountant
        $budgetItemsByProject = [];
        if ($userPermissions['can_accountant']) {
            $accountantProjectIds = $data['costs_accountant']->pluck('project_id')->filter()->unique()->values();
            if ($accountantProjectIds->isNotEmpty()) {
                $budgets = ProjectBudget::whereIn('project_id', $accountantProjectIds)->whereIn('status', ['approved', 'active'])->with(['items.costGroup'])->get();
                foreach ($budgets as $budget) {
                    foreach ($budget->items as $item) {
                        $budgetItemsByProject[$budget->project_id][] = [
                            'id' => $item->id, 'name' => $item->name, 'budget_name' => $budget->name, 'cost_group' => $item->costGroup?->name,
                            'estimated_amount' => (float)$item->estimated_amount, 'actual_amount' => (float)$item->actual_amount,
                            'remaining_amount' => (float)($item->estimated_amount - $item->actual_amount),
                        ];
                    }
                }
            }
        }

        return Inertia::render('Crm/Approvals/Index', [
            'roleGroups' => $roleGroups,
            'recentItems' => $this->formatRecentActivity($data['recent']),
            'stats' => $data['stats'],
            'userPermissions' => $userPermissions,
            'budgetItemsByProject' => $budgetItemsByProject,
        ]);
    }

    // =========================================================================
    // COST APPROVAL
    // =========================================================================

    public function approveManagement(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();
        
        if ($cost->project_id) {
            $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $cost->project);
        } else {
            $this->crmRequire($user, Permissions::COMPANY_COST_APPROVE_MANAGEMENT);
        }

        $result = $this->approvalActionService->approve($user, 'management', $id);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    public function approveAccountant(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();
        
        if ($cost->project_id) {
            $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $cost->project);
        } else {
            $this->crmRequire($user, Permissions::COMPANY_COST_APPROVE_ACCOUNTANT);
        }

        // Kế toán phải chọn ngân sách cho chi phí dự án
        if ($cost->project_id) {
            $request->validate([
                'budget_item_id' => 'required|exists:budget_items,id',
            ], [
                'budget_item_id.required' => 'Vui lòng chọn hạng mục ngân sách cho khoản chi này.',
                'budget_item_id.exists' => 'Hạng mục ngân sách không hợp lệ.',
            ]);
            $cost->update(['budget_item_id' => $request->budget_item_id]);
        }

        $result = $this->approvalActionService->approve($user, 'accountant', $id);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    /**
     * Universal Reject Method
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
            'type' => 'nullable|string'
        ]);

        $type = $request->get('type', 'management');
        $user = Auth::guard('admin')->user();
        
        // Basic requirement check (refine for company costs)
        // Note: For universal reject, we determine model by the type param but we really only have $id.
        // It relies on Cost model typically for generic 'reject'. Let's find out if it's a Cost.
        if (in_array($type, ['management', 'accountant', 'project_cost', 'company_cost'])) {
            $cost = \App\Models\Cost::find($id);
            if ($cost) {
                if ($cost->project_id) {
                    $this->crmRequire($user, Permissions::COST_REJECT, $cost->project);
                } else {
                    $this->crmRequire($user, Permissions::COMPANY_COST_REJECT);
                }
            } else {
                $this->crmRequire($user, Permissions::COST_REJECT);
            }
        } else {
            $this->crmRequire($user, Permissions::COST_REJECT);
        }

        $result = $this->approvalActionService->reject($user, $type, $id, $request->reason);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    // =========================================================================
    // ACCEPTANCE APPROVAL (GS, QLDA, Customer)
    // =========================================================================

    public function approveSupervisorAcceptance(Request $request, $id)
    {
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $acceptance->project);

        return $this->delegateApprove($user, 'acceptance_supervisor', $id);
    }

    public function rejectSupervisorAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $acceptance->project);

        return $this->delegateReject($user, 'acceptance_supervisor', $id, $request->reason);
    }

    public function approvePMAcceptance(Request $request, $id)
    {
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $acceptance->project);

        return $this->delegateApprove($user, 'acceptance_pm', $id);
    }

    public function rejectPMAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $acceptance->project);

        return $this->delegateReject($user, 'acceptance_pm', $id, $request->reason);
    }

    public function approveCustomerAcceptance(Request $request, $id)
    {
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $acceptance->project);

        return $this->delegateApprove($user, 'acceptance_customer', $id);
    }

    public function rejectAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $acceptance = Acceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $acceptance->project);

        return $this->delegateReject($user, 'acceptance_customer', $id, $request->reason);
    }

    public function approveSubAcceptance(Request $request, $id)
    {
        $item = SubcontractorAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_APPROVE, $item->project);

        return $this->delegateApprove($user, 'sub_acceptance', $id, ['notes' => $request->input('notes')]);
    }

    public function rejectSubAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $item = SubcontractorAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_APPROVE, $item->project);

        return $this->delegateReject($user, 'sub_acceptance', $id, $request->reason);
    }

    public function approveSupplierAcceptance(Request $request, $id)
    {
        $item = SupplierAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $item->project);

        return $this->delegateApprove($user, 'supplier_acceptance', $id, ['notes' => $request->input('notes')]);
    }

    public function rejectSupplierAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $item = SupplierAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $item->project);

        return $this->delegateReject($user, 'supplier_acceptance', $id, $request->reason);
    }

    // =========================================================================
    // CHANGE REQUEST APPROVAL
    // =========================================================================

    public function approveChangeRequest(Request $request, $id)
    {
        $item = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $item->project);

        $result = $this->approvalActionService->approve($user, 'change_request', $id, ['notes' => $request->input('notes')]);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    public function rejectChangeRequest(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $item = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $item->project);

        $result = $this->approvalActionService->reject($user, 'change_request', $id, $request->reason);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }


    // =========================================================================
    // ADDITIONAL COST APPROVAL
    // =========================================================================

    public function approveAdditionalCost(Request $request, $id)
    {
        $item = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_APPROVE, $item->project);

        $result = $this->approvalActionService->approve($user, 'additional_cost', $id);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    public function rejectAdditionalCost(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $item = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_APPROVE, $item->project);

        $result = $this->approvalActionService->reject($user, 'additional_cost', $id, $request->reason);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }


    // =========================================================================
    // SUBCONTRACTOR PAYMENT
    // =========================================================================

    public function approveSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_APPROVE, $payment->project);

        return $this->delegateApprove($user, 'sub_payment', $id);
    }

    public function confirmSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID, $payment->project);

        // Financial Gatekeeper: Ensure attachments exist
        if ($payment->attachments()->count() === 0) {
            return back()->with('error', 'Yêu cầu thanh toán NTP này bắt buộc phải có file chứng từ đi kèm (UNC/Hóa đơn) mới có thể xác nhận.');
        }

        // Link to budget if provided (pre-processing before service call)
        if ($request->has('budget_item_id')) {
            $payment->update(['budget_item_id' => $request->budget_item_id]);
        }

        return $this->delegateApprove($user, 'sub_payment_confirm', $id);
    }

    public function rejectSubPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_APPROVE, $payment->project);

        return $this->delegateReject($user, 'sub_payment', $id, $request->reason);
    }

    // =========================================================================
    // MATERIAL BILL APPROVAL
    // =========================================================================

    public function approveMaterialBill(Request $request, $id)
    {
        $bill = MaterialBill::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_APPROVE, $bill->project);

        // Normalize edge-case statuses before service call
        if (in_array($bill->status, ['draft', 'pending', 'rejected'])) {
            $bill->update(['status' => 'pending_management']);
        }

        return $this->delegateApprove($user, 'material_bill', $id);
    }

    public function rejectMaterialBill(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $bill = MaterialBill::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_APPROVE, $bill->project);

        return $this->delegateReject($user, 'material_bill', $id, $request->reason);
    }

    // =========================================================================
    // OTHER APPROVALS
    // =========================================================================

    public function approveContract(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_VIEW, $contract->project);

        return $this->delegateApprove($user, 'contract', $id);
    }

    public function rejectContract(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $contract = Contract::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_VIEW, $contract->project);

        return $this->delegateReject($user, 'contract', $id, $request->reason);
    }

    public function approvePayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_APPROVE, $payment->project);

        return $this->delegateApprove($user, 'project_payment', $id);
    }

    public function confirmProjectPayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_CONFIRM, $payment->project);

        return $this->delegateApprove($user, 'project_payment_confirm', $id);
    }

    public function rejectPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_APPROVE, $payment->project);

        return $this->delegateReject($user, 'project_payment', $id, $request->reason);
    }

    public function approveBudget(Request $request, $id)
    {
        $budget = ProjectBudget::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $budget->project);

        return $this->delegateApprove($user, 'budget', $id);
    }

    public function rejectBudget(Request $request, $id)
    {
        $budget = ProjectBudget::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $budget->project);

        return $this->delegateReject($user, 'budget', $id, $request->input('reason', 'Không đồng ý'));
    }

    public function approveConstructionLog(Request $request, $id)
    {
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::LOG_APPROVE, $log->project);

        return $this->delegateApprove($user, 'construction_log', $id);
    }

    public function rejectConstructionLog(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::LOG_APPROVE, $log->project);

        return $this->delegateReject($user, 'construction_log', $id, $request->reason);
    }

    public function verifyDefectFromApproval(Request $request, $id)
    {
        $defect = Defect::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_VERIFY, $defect->project);

        return $this->delegateApprove($user, 'defect_verify', $id);
    }

    public function rejectDefectFromApproval(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $defect = Defect::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_VERIFY, $defect->project);

        return $this->delegateReject($user, 'defect_verify', $id, $request->reason);
    }

    public function approveScheduleAdjustment(Request $request, $id)
    {
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::GANTT_UPDATE, $adj->project);

        return $this->delegateApprove($user, 'schedule_adjustment', $id, ['notes' => $request->input('notes')]);
    }

    public function rejectScheduleAdjustment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::GANTT_UPDATE, $adj->project);

        return $this->delegateReject($user, 'schedule_adjustment', $id, $request->reason);
    }

    // =========================================================================
    // MAINTENANCE & WARRANTY APPROVAL
    // =========================================================================

    public function approveMaintenance(Request $request, $id)
    {
        $item = \App\Models\ProjectMaintenance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $item->project);

        return $this->delegateApprove($user, 'maintenance', $id);
    }

    public function rejectMaintenance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $item = \App\Models\ProjectMaintenance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $item->project);

        return $this->delegateReject($user, 'maintenance', $id, $request->reason);
    }

    public function approveWarranty(Request $request, $id)
    {
        $item = \App\Models\ProjectWarranty::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $item->project);

        return $this->delegateApprove($user, 'warranty', $id);
    }

    public function rejectWarranty(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $item = \App\Models\ProjectWarranty::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $item->project);

        return $this->delegateReject($user, 'warranty', $id, $request->reason);
    }

    // =========================================================================
    // EQUIPMENT PURCHASE
    // =========================================================================

    public function approveEquipmentPurchaseManagement(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        return $this->delegateApprove($user, 'equipment_purchase_management', $id);
    }

    public function approveEquipmentPurchaseAccountant(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        return $this->delegateApprove($user, 'equipment_purchase_accountant', $id);
    }

    public function rejectEquipmentPurchase(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $user = Auth::guard('admin')->user();
        return $this->delegateReject($user, 'equipment_purchase_management', $id, $request->reason); // "type" dictates which block model maps to in ApprovalActionService, equipment_purchase_management works for rejection
    }

    // =========================================================================
    // SHARED DELEGATE HELPERS — Single source of truth via ApprovalActionService
    // =========================================================================

    private function delegateApprove($user, string $type, $id, array $params = [])
    {
        $result = $this->approvalActionService->approve($user, $type, $id, $params);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    private function delegateReject($user, string $type, $id, string $reason)
    {
        $result = $this->approvalActionService->reject($user, $type, $id, $reason);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    // =========================================================================
    // FORMAT HELPERS
    // =========================================================================

    private function formatItem(Cost $cost): array
    {
        return [
            'id' => $cost->id,
            'type' => $cost->project_id ? 'project_cost' : 'company_cost',
            'type_label' => $cost->project_id ? 'Chi phí DA' : 'Chi phí C.Ty',
            'title' => $cost->name,
            'subtitle' => $cost->project_id ? (($cost->project->code ?? '') . ' - ' . ($cost->project->name ?? 'Dự án')) : 'Chi phí công ty',
            'amount' => (float) $cost->amount,
            'status' => $cost->status,
            'status_label' => $this->getStatusLabel($cost->status),
            'created_by' => $cost->creator->name ?? 'N/A',
            'created_at' => optional($cost->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $cost->description,
            'project_id' => $cost->project_id,
            'category' => $cost->category,
            'attendance_id' => $cost->attendance_id,
            'attachments' => $this->formatAttachments($cost->attachments),
            'attachments_count' => $cost->attachments->count(),
        ];
    }

    private function formatAcceptanceItem(Acceptance $acceptance, ?string $statusLabel = null, ?string $approvalLevel = null): array
    {
        // Eager-load defects with attachments for before/after image display
        if (!$acceptance->relationLoaded('defects')) {
            $acceptance->load(['defects.attachments', 'defects.reporter', 'defects.fixer']);
        }

        // Categorize attachments into before/after/other
        $attachments = $acceptance->attachments->map(fn($a) => [
            'id' => $a->id,
            'name' => $a->file_name,
            'url' => $a->file_url,
            'size' => $a->file_size_formatted,
            'type' => $a->type,
            'description' => $a->description, // 'before' | 'after' | null
            'mime_type' => $a->mime_type,
            'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
        ]);

        // Format defects with their images
        $defects = $acceptance->defects->map(fn($d) => [
            'id' => $d->id,
            'description' => $d->description,
            'severity' => $d->severity,
            'status' => $d->status,
            'reporter' => $d->reporter?->name,
            'fixer' => $d->fixer?->name,
            'before_images' => $d->attachments
                ->filter(fn($a) => in_array($a->type, ['before']) || in_array($a->description, ['before']) || (empty($a->type) && empty($a->description)))
                ->filter(fn($a) => $a->mime_type && str_starts_with($a->mime_type, 'image/'))
                ->map(fn($a) => [
                    'id' => $a->id,
                    'name' => $a->file_name,
                    'url' => $a->file_url,
                    'mime_type' => $a->mime_type,
                ])->values(),
            'after_images' => $d->attachments
                ->filter(fn($a) => $a->type === 'after' || $a->description === 'after')
                ->filter(fn($a) => $a->mime_type && str_starts_with($a->mime_type, 'image/'))
                ->map(fn($a) => [
                    'id' => $a->id,
                    'name' => $a->file_name,
                    'url' => $a->file_url,
                    'mime_type' => $a->mime_type,
                ])->values(),
        ]);

        return [
            'id' => $acceptance->id,
            'type' => 'acceptance',
            'type_label' => 'Nghiệm thu',
            'title' => $acceptance->name,
            'subtitle' => ($acceptance->project->code ?? '') . ' - ' . ($acceptance->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $acceptance->workflow_status,
            'status_label' => $statusLabel ?? $this->getStatusLabel($acceptance->workflow_status),
            'created_by' => $acceptance->submitter?->name ?? ($acceptance->project?->projectManager?->name ?? 'N/A'),
            'created_at' => optional($acceptance->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $acceptance->description,
            'project_id' => $acceptance->project_id,
            'approval_level' => $approvalLevel ?? 'customer',
            'has_open_defects' => $acceptance->has_open_defects,
            'defects' => $defects,
            'before_images' => $attachments->filter(fn($a) => (in_array($a['type'], ['before']) || in_array($a['description'], ['before']) || (empty($a['type']) && empty($a['description']))) && $a['is_image'])->values(),
            'after_images' => $attachments->filter(fn($a) => ($a['type'] === 'after' || $a['description'] === 'after') && $a['is_image'])->values(),
            'attachments' => $attachments,
            'attachments_count' => $acceptance->attachments->count(),
        ];
    }

    private function formatChangeRequestItem(ChangeRequest $cr): array
    {
        return [
            'id' => $cr->id,
            'type' => 'change_request',
            'type_label' => 'Thay đổi',
            'title' => $cr->title,
            'subtitle' => ($cr->project->code ?? '') . ' - ' . ($cr->project->name ?? 'Dự án'),
            'amount' => (float) $cr->estimated_cost_impact,
            'status' => $cr->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $cr->requester->name ?? 'N/A',
            'created_at' => optional($cr->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $cr->description,
            'project_id' => $cr->project_id,
            'attachments' => $this->formatAttachments($cr->attachments),
            'attachments_count' => $cr->attachments->count(),
        ];
    }

    private function formatAdditionalCostItem(AdditionalCost $ac): array
    {
        return [
            'id' => $ac->id,
            'type' => 'additional_cost',
            'type_label' => 'CP Phát sinh',
            'title' => Str::limit($ac->description, 60),
            'subtitle' => ($ac->project->code ?? '') . ' - ' . ($ac->project->name ?? 'Dự án'),
            'amount' => (float) $ac->amount,
            'status' => $ac->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $ac->proposer->name ?? 'N/A',
            'created_at' => optional($ac->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $ac->project_id,
            'attachments' => $this->formatAttachments($ac->attachments),
            'attachments_count' => $ac->attachments->count(),
        ];
    }

    private function formatSubPaymentItem(SubcontractorPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'type' => 'sub_payment',
            'type_label' => 'Thanh toán NTP',
            'title' => 'Thanh toán: ' . ($payment->subcontractor->name ?? 'N/A'),
            'subtitle' => ($payment->project->code ?? '') . ' - ' . ($payment->project->name ?? 'Dự án'),
            'amount' => (float) $payment->amount,
            'status' => $payment->status,
            'status_label' => match($payment->status) {
                'pending_management_approval' => 'Chờ BĐH duyệt',
                'pending_accountant_confirmation' => 'Chờ KT xác nhận',
                'paid' => 'Đã thanh toán',
                default => $payment->status
            },
            'created_by' => $payment->creator->name ?? 'N/A',
            'created_at' => optional($payment->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $payment->project_id,
            'attachments' => $this->formatAttachments($payment->attachments),
            'attachments_count' => $payment->attachments->count(),
        ];
    }

    private function formatContractItem(Contract $contract): array
    {
        return [
            'id' => $contract->id,
            'type' => 'contract',
            'type_label' => 'Hợp đồng',
            'title' => "HĐ Dự án",
            'subtitle' => ($contract->project->code ?? '') . ' - ' . ($contract->project->name ?? 'Dự án'),
            'amount' => (float) $contract->contract_value,
            'status' => $contract->status,
            'status_label' => 'Chờ KH duyệt',
            'created_by' => 'Hệ thống',
            'created_at' => optional($contract->updated_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $contract->project_id,
            'attachments' => $contract->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $contract->attachments->count(),
        ];
    }

    private function formatPaymentItem(ProjectPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'type' => 'project_payment',
            'type_label' => 'Thanh toán DA',
            'title' => 'Đợt ' . ($payment->payment_number ?? $payment->id),
            'subtitle' => ($payment->project->code ?? '') . ' - ' . ($payment->project->name ?? 'Dự án'),
            'amount' => (float) $payment->amount,
            'status' => $payment->status,
            'status_label' => match($payment->status) {
                'customer_pending_approval' => 'Chờ KH duyệt',
                'customer_approved' => 'KH đã duyệt — Chờ trả tiền',
                'customer_paid' => 'Chờ KT xác nhận',
                'confirmed', 'paid' => 'Đã xác nhận',
                default => $payment->status
            },
            'created_by' => 'Hệ thống',
            'created_at' => optional($payment->updated_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $payment->project_id,
            'attachments' => $this->formatAttachments($payment->attachments),
            'attachments_count' => $payment->attachments->count(),
        ];
    }

    private function formatMaterialBillItem($bill): array
    {
        return [
            'id' => $bill->id,
            'type' => 'material_bill',
            'type_label' => 'Phiếu vật tư',
            'title' => $bill->bill_number ?? "Phiếu #{$bill->id}",
            'subtitle' => ($bill->project->code ?? '') . ' - ' . ($bill->project->name ?? 'Dự án'),
            'amount' => (float) $bill->total_amount,
            'status' => $bill->status,
            'status_label' => match($bill->status) {
                'pending_management' => 'Chờ BĐH duyệt',
                'pending_accountant' => 'Chờ KT xác nhận',
                default => $bill->status
            },
            'created_by' => $bill->creator->name ?? 'N/A',
            'created_at' => optional($bill->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $bill->project_id,
            'attachments' => $bill->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $bill->attachments->count(),
        ];
    }

    private function formatSubAcceptanceItem(SubcontractorAcceptance $sa): array
    {
        return [
            'id' => $sa->id,
            'type' => 'sub_acceptance',
            'type_label' => 'NT NTP',
            'title' => $sa->name ?? 'Nghiệm thu NTP',
            'subtitle' => ($sa->project->code ?? '') . ' - ' . ($sa->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $sa->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $sa->creator->name ?? 'N/A',
            'created_at' => optional($sa->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $sa->project_id,
            'attachments' => $sa->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $sa->attachments->count(),
        ];
    }

    private function formatSupplierAcceptanceItem(SupplierAcceptance $sa): array
    {
        return [
            'id' => $sa->id,
            'type' => 'supplier_acceptance',
            'type_label' => 'NT NCC',
            'title' => $sa->name ?? 'Nghiệm thu NCC',
            'subtitle' => ($sa->project->code ?? '') . ' - ' . ($sa->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $sa->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $sa->creator->name ?? 'N/A',
            'created_at' => optional($sa->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $sa->project_id,
            'attachments' => $sa->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $sa->attachments->count(),
        ];
    }

    private function formatConstructionLogItem(ConstructionLog $log): array
    {
        return [
            'id' => $log->id,
            'type' => 'construction_log',
            'type_label' => 'Nhật ký CT',
            'title' => 'Nhật ký ' . optional($log->log_date)->format('d/m/Y'),
            'subtitle' => ($log->project->code ?? '') . ' - ' . ($log->project->name ?? 'Dự án'),
            'status' => $log->approval_status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $log->creator->name ?? 'N/A',
            'created_at' => optional($log->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $log->project_id,
            'attachments' => $log->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $log->attachments->count(),
        ];
    }

    private function formatScheduleAdjustmentItem(ScheduleAdjustment $adj): array
    {
        return [
            'id' => $adj->id,
            'type' => 'schedule_adjustment',
            'type_label' => 'Điều chỉnh TĐ',
            'title' => ($adj->task?->name ?? 'Điều chỉnh') . ($adj->delay_days ? " (+{$adj->delay_days} ngày)" : ''),
            'subtitle' => ($adj->project->code ?? '') . ' - ' . ($adj->project->name ?? 'Dự án'),
            'status' => $adj->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $adj->creator->name ?? 'N/A',
            'created_at' => optional($adj->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $adj->project_id,
            'attachments' => $adj->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $adj->attachments->count(),
        ];
    }

    private function formatDefectItem(Defect $defect): array
    {
        $beforeImages = $defect->attachments
            ->filter(fn($a) => (in_array($a->type, ['before']) || in_array($a->description, ['before']) || (empty($a->type) && empty($a->description))) && $a->mime_type && str_starts_with($a->mime_type, 'image/'))
            ->values();
        $afterImages = $defect->attachments
            ->filter(fn($a) => ($a->type === 'after' || $a->description === 'after') && $a->mime_type && str_starts_with($a->mime_type, 'image/'))
            ->values();

        return [
            'id' => $defect->id,
            'type' => 'defect',
            'type_label' => 'Lỗi nghiệm thu',
            'title' => Str::limit($defect->description, 80),
            'subtitle' => ($defect->project->code ?? '') . ' - ' . ($defect->project->name ?? 'Dự án'),
            'status' => $defect->status,
            'status_label' => 'Chờ xác nhận fix',
            'created_by' => $defect->fixer->name ?? 'N/A',
            'created_at' => optional($defect->fixed_at ?? $defect->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $defect->description,
            'severity' => $defect->severity,
            'project_id' => $defect->project_id,
            'before_images' => $beforeImages->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'mime_type' => $a->mime_type,
            ]),
            'after_images' => $afterImages->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'mime_type' => $a->mime_type,
            ]),
            'attachments' => $defect->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'type' => $a->type,
                'description' => $a->description,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $defect->attachments->count(),
        ];
    }

    private function formatBudget($budget): array
    {
        return [
            'id' => $budget->id,
            'type' => 'budget',
            'type_label' => 'Ngân sách DA',
            'title' => $budget->name ?? "Ngân sách mới",
            'subtitle' => ($budget->project->code ?? '') . ' - ' . ($budget->project->name ?? 'Dự án'),
            'amount' => (float) $budget->total_budget,
            'status' => $budget->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $budget->creator->name ?? 'N/A',
            'created_at' => optional($budget->created_at)->format('d/m/Y H:i') ?? '',
            'project_id' => $budget->project_id,
            'next_action' => $budget->next_action,
            'approval_status_info' => $budget->approval_status_info,
            'attachments' => $budget->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $budget->attachments->count(),
        ];
    }

    private function formatEquipmentRentalItem(EquipmentRental $rental): array
    {
        return [
            'id' => $rental->id,
            'type' => 'equipment_rental',
            'type_label' => 'Thuê thiết bị',
            'title' => $rental->equipment_name ?? "Thuê thiết bị",
            'subtitle' => ($rental->project->code ?? '') . ' - ' . ($rental->project->name ?? 'Dự án'),
            'amount' => (float) $rental->total_cost,
            'status' => $rental->status,
            'status_label' => $rental::STATUS_LABELS[$rental->status] ?? $rental->status,
            'created_by' => $rental->creator->name ?? 'N/A',
            'created_at' => optional($rental->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $rental->notes,
            'project_id' => $rental->project_id,
            'attachments' => $rental->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $rental->attachments->count(),
        ];
    }

    private function formatEquipmentPurchaseItem(\App\Models\EquipmentPurchase $purchase): array
    {
        return [
            'id' => $purchase->id,
            'type' => 'equipment_purchase',
            'type_label' => 'Mua thiết bị',
            'title' => 'Mua TB mới: ' . ($purchase->project->name ?? 'Dự án'),
            'subtitle' => 'Tổng: ' . number_format($purchase->total_amount, 0) . 'đ',
            'amount' => (float) $purchase->total_amount,
            'status' => $purchase->status,
            'status_label' => $purchase::STATUS_LABELS[$purchase->status] ?? $purchase->status,
            'created_by' => $purchase->creator->name ?? 'N/A',
            'created_at' => optional($purchase->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $purchase->notes,
            'project_id' => $purchase->project_id,
            'attachments' => $purchase->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $purchase->attachments->count(),
        ];
    }

    private function formatEquipmentInventoryItem(\App\Models\Equipment $equipment): array
    {
        $totalAmount = ($equipment->purchase_price ?: 0) * ($equipment->quantity ?: 1);
        return [
            'id' => $equipment->id,
            'type' => 'equipment_inventory',
            'type_label' => 'Kho thiết bị',
            'title' => $equipment->name,
            'subtitle' => ($equipment->code ? "#{$equipment->code} — " : '') . 'SL: ' . ($equipment->quantity ?: 1),
            'amount' => (float) $totalAmount,
            'status' => $equipment->status,
            'status_label' => $this->getStatusLabel($equipment->status),
            'created_by' => $equipment->creator->name ?? 'N/A',
            'created_at' => optional($equipment->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $equipment->notes,
            'project_id' => $equipment->project_id,
            'attachments' => $equipment->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $equipment->attachments->count(),
        ];
    }

    private function formatAssetUsageItem(AssetUsage $usage): array
    {
        return [
            'id' => $usage->id,
            'type' => 'asset_usage',
            'type_label' => 'Sử dụng T.bị',
            'title' => ($usage->asset->name ?? "Thiết bị") . " (x{$usage->quantity})",
            'subtitle' => ($usage->project->code ?? '') . ' - ' . ($usage->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $usage->status,
            'status_label' => $usage::STATUS_LABELS[$usage->status] ?? $usage->status,
            'created_by' => $usage->creator->name ?? 'N/A',
            'created_at' => optional($usage->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $usage->notes,
            'project_id' => $usage->project_id,
            'attachments' => $usage->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
                'mime_type' => $a->mime_type,
                'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
            ]),
            'attachments_count' => $usage->attachments->count(),
        ];
    }

    private function formatMaintenanceItem(\App\Models\ProjectMaintenance $m): array
    {
        return [
            'id' => $m->id,
            'type' => 'maintenance',
            'type_label' => 'Bảo trì',
            'title' => 'Phiếu bảo trì định kỳ',
            'subtitle' => ($m->project->code ?? '') . ' - ' . ($m->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $m->status,
            'status_label' => $this->getStatusLabel($m->status),
            'created_by' => $m->creator->name ?? 'N/A',
            'created_by_email' => $m->creator->email ?? '',
            'created_at' => optional($m->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $m->notes,
            'project_id' => $m->project_id,
            'maintenance_date' => optional($m->maintenance_date)->format('d/m/Y'),
            'next_maintenance_date' => optional($m->next_maintenance_date)->format('d/m/Y'),
            'attachments' => $this->formatAttachments($m->attachments),
            'attachments_count' => $m->attachments->count(),
        ];
    }

    private function formatWarrantyItem(\App\Models\ProjectWarranty $w): array
    {
        return [
            'id' => $w->id,
            'type' => 'warranty',
            'type_label' => 'Bảo hành',
            'title' => 'Phiếu bảo hành/Bàn giao',
            'subtitle' => ($w->project->code ?? '') . ' - ' . ($w->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $w->status,
            'status_label' => $this->getStatusLabel($w->status),
            'created_by' => $w->creator->name ?? 'N/A',
            'created_by_email' => $w->creator->email ?? '',
            'created_at' => optional($w->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $w->warranty_content,
            'project_id' => $w->project_id,
            'handover_date' => optional($w->handover_date)->format('d/m/Y'),
            'attachments' => $this->formatAttachments($w->attachments),
            'attachments_count' => $w->attachments->count(),
        ];
    }

    private function formatAttendanceItem(Attendance $att): array
    {
        $statusLabels = [
            'present' => 'Có mặt', 'absent' => 'Vắng mặt', 'leave' => 'Nghỉ phép',
            'late' => 'Đi muộn', 'early_leave' => 'Về sớm', 'holiday' => 'Nghỉ lễ',
        ];
        $hours = $att->hours_worked ? number_format((float)$att->hours_worked, 1) . 'h' : '';
        $ot = $att->overtime_hours && $att->overtime_hours > 0 ? " + OT {$att->overtime_hours}h" : '';
        return [
            'id'              => $att->id,
            'type'            => 'attendance',
            'type_label'      => 'Chấm công',
            'title'           => ($att->user->name ?? "NV #{$att->user_id}") . ' — ' . optional($att->work_date)->format('d/m/Y'),
            'subtitle'        => ($att->project->code ?? 'N/A') . ' - ' . ($att->project->name ?? 'Không có dự án'),
            'amount'          => 0,
            'status'          => $att->workflow_status,
            'status_label'    => 'Chờ duyệt',
            'created_by'      => $att->user->name ?? 'N/A',
            'created_by_email'=> $att->user->email ?? '',
            'created_at'      => optional($att->work_date)->format('d/m/Y') ?? '',
            'description'     => ($statusLabels[$att->status] ?? $att->status) . ($hours ? " · $hours" : '') . $ot,
            'project_id'      => $att->project_id,
            'attachments'     => [],
            'attachments_count' => 0,
        ];
    }

    // =========================================================================
    // ATTENDANCE APPROVAL (from Approval Center)
    // =========================================================================

    public function approveAttendance(Request $request, $id)
    {
        $attendance = Attendance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ATTENDANCE_APPROVE);

        $this->attendanceService->approve($attendance, $user);
        return back()->with('success', 'Đã duyệt chấm công thành công.');
    }

    public function rejectAttendance(Request $request, $id)
    {
        $attendance = Attendance::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ATTENDANCE_APPROVE);

        $reason = $request->validate(['reason' => 'required|string|max:500'])['reason'];
        $this->attendanceService->reject($attendance, $user, $reason);
        return back()->with('success', 'Đã từ chối phiếu chấm công.');
    }

    private function formatRecentActivity(array $recent): \Illuminate\Support\Collection
    {
        return collect([])
            ->concat($recent['costs']->map(fn($i) => $this->formatItem($i)))
            ->concat($recent['change_requests']->map(fn($i) => $this->formatChangeRequestItem($i)))
            ->concat($recent['additional_costs']->map(fn($i) => $this->formatAdditionalCostItem($i)))
            ->concat($recent['sub_payments']->map(fn($i) => $this->formatSubPaymentItem($i)))
            ->concat($recent['acceptances']->map(fn($i) => $this->formatAcceptanceItem($i, 'Nghiệm thu', 'customer')))
            ->concat($recent['budgets']->map(fn($i) => $this->formatBudget($i)))
            ->concat($recent['equipment_rentals']->map(fn($i) => $this->formatEquipmentRentalItem($i)))
            ->concat($recent['asset_usages']->map(fn($i) => $this->formatAssetUsageItem($i)))
            ->concat($recent['contracts']->map(fn($i) => $this->formatContractItem($i)))
            ->concat($recent['project_payments']->map(fn($i) => $this->formatPaymentItem($i)))
            ->concat($recent['material_bills']->map(fn($i) => $this->formatMaterialBillItem($i)))
            ->concat($recent['sub_acceptances']->map(fn($i) => $this->formatSubAcceptanceItem($i)))
            ->concat($recent['supplier_acceptances']->map(fn($i) => $this->formatSupplierAcceptanceItem($i)))
            // construction_logs removed — BUSINESS RULE: Nhật ký không cần duyệt
            ->concat($recent['schedule_adjustments']->map(fn($i) => $this->formatScheduleAdjustmentItem($i)))
            ->concat($recent['defects']->map(fn($i) => $this->formatDefectItem($i)))
            ->concat($recent['attendances']->map(fn($i) => $this->formatAttendanceItem($i)))
            ->concat($recent['maintenances']->map(fn($i) => $this->formatMaintenanceItem($i)))
            ->concat($recent['warranties']->map(fn($i) => $this->formatWarrantyItem($i)))
            ->unique(fn($item) => ($item['type'] ?? '') . '_' . $item['id'])->sortByDesc(fn($i) => $i['created_at'])->take(30)->values();
    }

    private function getStatusLabel(string $status): string
    {
        $labels = [
            'draft' => 'Nháp', 'submitted' => 'Đã gửi duyệt',
            'pending' => 'Chờ duyệt', 'supervisor_approved' => 'GS đã duyệt', 'project_manager_approved' => 'QLDA đã duyệt',
            'customer_approved' => 'KH đã duyệt', 'owner_approved' => 'CĐT đã duyệt', 'design_approved' => 'TK đã duyệt',
            'internal_approved' => 'Nội bộ đã duyệt', 'pending_management_approval' => 'Chờ BĐH duyệt',
            'pending_accountant_approval' => 'Chờ KT xác nhận', 'pending_accountant' => 'Chờ KT xác nhận',
            'pending_accountant_confirmation' => 'Chờ KT xác nhận',
            'pending_customer_approval' => 'Chờ duyệt', 'customer_pending_approval' => 'Chờ duyệt',
            'available' => 'Đã hoàn thành', 'completed' => 'Đã hoàn thành',
            'approved' => 'Đã duyệt', 'active' => 'Đang áp dụng',
            'archived' => 'Đã lưu trữ', 'paid' => 'Đã thanh toán', 'rejected' => 'Chưa đạt',
            'open' => 'Mới', 'in_progress' => 'Đang sửa lỗi', 'fixed' => 'Đã sửa — Chờ xác nhận', 'verified' => 'Đã xác nhận',
            'pending_customer' => 'Chờ duyệt',
        ];
        return $labels[$status] ?? $status;
    }

    private function formatAttachments($attachments): \Illuminate\Support\Collection
    {
        return $attachments->map(fn($a) => [
            'id' => $a->id, 'name' => $a->file_name, 'url' => $a->file_url, 'size' => $a->file_size_formatted,
            'mime_type' => $a->mime_type, 'is_image' => $a->mime_type && str_starts_with($a->mime_type, 'image/'),
        ]);
    }
}
