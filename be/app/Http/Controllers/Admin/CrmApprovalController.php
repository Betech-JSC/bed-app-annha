<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
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

    public function __construct(
        ApprovalQueryService $approvalQueryService,
        ApprovalActionService $approvalActionService
    ) {
        $this->approvalQueryService = $approvalQueryService;
        $this->approvalActionService = $approvalActionService;
    }

    /**
     * Display the Approval Center page — grouped by approval level.
     */
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $data = $this->approvalQueryService->getApprovalData($user);

        // Map data using existing formatters
        $managementItemsFormatted = $data['costs_management']->map(fn(Cost $cost) => $this->formatItem($cost));
        $accountantItemsFormatted = $data['costs_accountant']->map(fn(Cost $cost) => $this->formatItem($cost));

        $acceptanceSupervisorItemsFormatted = $data['acceptance_supervisor']->map(
            fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ GS duyệt', 'supervisor')
        );
        $acceptancePMItemsFormatted = $data['acceptance_pm']->map(
            fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ QLDA duyệt', 'project_manager')
        );
        $customerAcceptanceItemsFormatted = $data['acceptance_customer']->map(
            fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ KH duyệt', 'customer')
        );

        $changeRequestItemsFormatted = $data['change_requests']->map(fn(ChangeRequest $cr) => $this->formatChangeRequestItem($cr));
        $additionalCostItemsFormatted = $data['additional_costs']->map(fn(AdditionalCost $ac) => $this->formatAdditionalCostItem($ac));

        $subPaymentManagementFormatted = $data['sub_payments_management']->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));
        $subPaymentAccountantFormatted = $data['sub_payments_accountant']->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));

        $contractItemsFormatted = $data['contracts']->map(fn(Contract $c) => $this->formatContractItem($c));
        $pendingPaymentItemsFormatted = $data['payments_pending']->map(fn(ProjectPayment $p) => $this->formatPaymentItem($p));
        $paidPaymentItemsFormatted = $data['payments_paid']->map(fn(ProjectPayment $p) => $this->formatPaymentItem($p));

        $materialBillManagementItemsFormatted = $data['material_bills_management']->map(fn($b) => $this->formatMaterialBillItem($b));
        $materialBillAccountantItemsFormatted = $data['material_bills_accountant']->map(fn($b) => $this->formatMaterialBillItem($b));

        $subAcceptanceItemsFormatted = $data['sub_acceptances']->map(fn(SubcontractorAcceptance $sa) => $this->formatSubAcceptanceItem($sa));
        $supplierAcceptanceItemsFormatted = $data['supplier_acceptances']->map(fn(SupplierAcceptance $sa) => $this->formatSupplierAcceptanceItem($sa));

        $constructionLogItemsFormatted = $data['construction_logs']->map(fn(ConstructionLog $log) => $this->formatConstructionLogItem($log));
        $scheduleAdjustmentItemsFormatted = $data['schedule_adjustments']->map(fn(ScheduleAdjustment $adj) => $this->formatScheduleAdjustmentItem($adj));
        $defectItemsFormatted = $data['defects']->map(fn(Defect $d) => $this->formatDefectItem($d));
        $budgetItemsFormatted = $data['budgets']->map(fn(ProjectBudget $b) => $this->formatBudget($b));

        $equipmentRentalManagementFormatted = $data['equipment_rentals_management']->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));
        $equipmentRentalAccountantFormatted = $data['equipment_rentals_accountant']->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));
        $equipmentRentalReturnFormatted = $data['equipment_rentals_return']->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));

        $assetUsageManagementFormatted = $data['asset_usages_management']->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));
        $assetUsageAccountantFormatted = $data['asset_usages_accountant']->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));
        $assetUsageReturnFormatted = $data['asset_usages_return']->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));

        // Format recent activity items
        $recent = $data['recent'];
        $recentItems = collect([])
            ->concat($recent['costs']->map(fn(Cost $item) => $this->formatItem($item)))
            ->concat($recent['change_requests']->map(fn(ChangeRequest $item) => $this->formatChangeRequestItem($item)))
            ->concat($recent['additional_costs']->map(fn(AdditionalCost $item) => $this->formatAdditionalCostItem($item)))
            ->concat($recent['sub_payments']->map(fn(SubcontractorPayment $item) => $this->formatSubPaymentItem($item)))
            ->concat($recent['acceptances']->map(fn(AcceptanceStage $item) => $this->formatAcceptanceItem($item, 'Nghiệm thu', 'customer')))
            ->concat($recent['budgets']->map(fn(ProjectBudget $item) => $this->formatBudget($item)))
            ->concat($recent['equipment_rentals']->map(fn(EquipmentRental $item) => $this->formatEquipmentRentalItem($item)))
            ->concat($recent['asset_usages']->map(fn(AssetUsage $item) => $this->formatAssetUsageItem($item)))
            ->sortByDesc(fn($item) => $item['created_at']) // Use simple sort since they are formatted
            ->take(30)
            ->values();

        // ─────────────────────────────────────────────────────────────────────
        // GROUP ITEMS BY ROLE BUCKET (Web CRM) — WITH STRICT RBAC FILTERING
        // ─────────────────────────────────────────────────────────────────────
        $roleGroups = [
            'management' => $this->crmCan($user, Permissions::COST_APPROVE_MANAGEMENT)
                ? collect([])
                    ->concat($managementItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'management'])))
                    ->concat($additionalCostItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'additional_cost'])))
                    ->concat($subPaymentManagementFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'sub_payment'])))
                    ->concat($materialBillManagementItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'material_bill'])))
                    ->concat($budgetItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'budget'])))
                    ->concat($equipmentRentalManagementFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'equipment_rental_management'])))
                    ->concat($assetUsageManagementFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'asset_usage_management'])))
                    ->values()
                : collect([]),

            'accountant' => $this->crmCan($user, Permissions::COST_APPROVE_ACCOUNTANT)
                ? collect([])
                    ->concat($accountantItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'accountant'])))
                    ->concat($subPaymentAccountantFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'sub_payment_confirm'])))
                    ->concat($paidPaymentItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'project_payment_confirm'])))
                    ->concat($materialBillAccountantItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'material_bill'])))
                    ->concat($equipmentRentalAccountantFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'equipment_rental_accountant'])))
                    ->concat($assetUsageAccountantFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'asset_usage_accountant'])))
                    ->values()
                : collect([]),

            'project_manager' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2)
                ? collect([])
                    ->concat($acceptancePMItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'acceptance_pm'])))
                    ->concat($changeRequestItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'change_request'])))
                    ->concat($constructionLogItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'construction_log'])))
                    ->concat($scheduleAdjustmentItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'schedule_adjustment'])))
                    ->concat($equipmentRentalReturnFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'equipment_rental_return'])))
                    ->concat($assetUsageReturnFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'asset_usage_return'])))
                    ->values()
                : collect([]),

            'supervisor' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                ? collect([])
                    ->concat($acceptanceSupervisorItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'acceptance_supervisor'])))
                    ->concat($subAcceptanceItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'sub_acceptance'])))
                    ->concat($supplierAcceptanceItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'supplier_acceptance'])))
                    ->concat($defectItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'defect_verify'])))
                    ->values()
                : collect([]),

            'customer' => ($this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $this->crmCan($user, Permissions::PAYMENT_APPROVE))
                ? collect([])
                    ->concat($customerAcceptanceItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'acceptance'])))
                    ->concat($contractItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'contract'])))
                    ->concat($pendingPaymentItemsFormatted->map(fn($i) => array_merge($i, ['_approveType' => 'project_payment'])))
                    ->values()
                : collect([]),
        ];

        // Add a "permissions" map to help UI decide initial tab
        $userPermissions = [
            'can_management' => $this->crmCan($user, Permissions::COST_APPROVE_MANAGEMENT),
            'can_accountant' => $this->crmCan($user, Permissions::COST_APPROVE_ACCOUNTANT),
            'can_pm' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2),
            'can_supervisor' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1),
            'can_customer' => $this->crmCan($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3) || $this->crmCan($user, Permissions::PAYMENT_APPROVE),
        ];

        return Inertia::render('Crm/Approvals/Index', [
            'roleGroups' => $roleGroups,
            'recentItems' => $recentItems,
            'stats' => $data['stats'],
            'userPermissions' => $userPermissions,
        ]);
    }

    // =========================================================================
    // COST APPROVAL
    // =========================================================================

    public function approveManagement(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $cost->project);

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
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $cost->project);

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
        
        // Basic requirement check (can be refined per type if needed)
        $this->crmRequire($user, Permissions::COST_REJECT);

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
        $user = Auth::guard('admin')->user();
        // Permission check done in Service, but we can do a high-level one here too
        $result = $this->approvalActionService->approve($user, 'acceptance_supervisor', $id);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    public function approvePMAcceptance(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $result = $this->approvalActionService->approve($user, 'acceptance_pm', $id);

        if ($result['success']) {
            return back()->with('success', $result['message']);
        }
        return back()->with('error', $result['message']);
    }

    public function approveCustomerAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $stage->project);

        if ($stage->status !== 'project_manager_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái chờ KH duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $stage->approveCustomer($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt nghiệm thu (KH)');
            }
            DB::commit();
            return back()->with('success', "Khách hàng đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu (KH)');
        }
    }

    public function rejectAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $stage->project);

        try {
            DB::beginTransaction();
            $stage->reject($request->reason, $user);
            DB::commit();
            return back()->with('success', "Đã từ chối nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu');
        }
    }

    // =========================================================================
    // CHANGE REQUEST APPROVAL
    // =========================================================================

    public function approveChangeRequest(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $result = $this->approvalActionService->approve($user, 'change_request', $id, ['notes' => $request->input('notes')]);

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
        $user = Auth::guard('admin')->user();
        $result = $this->approvalActionService->approve($user, 'additional_cost', $id);

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

        try {
            DB::beginTransaction();
            $result = $payment->approve($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt thanh toán NTP');
            }
            DB::commit();
            return back()->with('success', 'Đã duyệt thanh toán NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt thanh toán NTP');
        }
    }

    public function confirmSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID, $payment->project);

        // Financial Gatekeeper: Ensure attachments exist for financial flow
        if ($payment->attachments()->count() === 0) {
            return back()->with('error', 'Yêu cầu thanh toán NTP này bắt buộc phải có file chứng từ đi kèm (UNC/Hóa đơn) mới có thể xác nhận.');
        }

        try {
            DB::beginTransaction();
            $result = $payment->markAsPaid($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể xác nhận thanh toán NTP');
            }
            DB::commit();
            return back()->with('success', 'Đã xác nhận thanh toán NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi xác nhận thanh toán NTP');
        }
    }

    public function rejectSubPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_APPROVE, $payment->project);

        try {
            DB::beginTransaction();
            $payment->reject($user, $request->reason);
            DB::commit();
            return back()->with('success', 'Đã từ chối thanh toán NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối thanh toán NTP');
        }
    }

    // =========================================================================
    // MATERIAL BILL APPROVAL
    // =========================================================================

    public function approveMaterialBill(Request $request, $id)
    {
        $materialBillClass = 'App\\Models\\MaterialBill';
        if (!class_exists($materialBillClass)) {
            return back()->with('error', 'Module Phiếu vật tư chưa được cài đặt');
        }

        $bill = $materialBillClass::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_APPROVE, $bill->project);

        try {
            DB::beginTransaction();

            if (in_array($bill->status, ['draft', 'pending', 'pending_management', 'rejected'])) {
                $result = $bill->approveByManagement($user);
            } elseif ($bill->status === 'pending_accountant') {
                $result = $bill->approveByAccountant($user);
            } else {
                DB::rollBack();
                return back()->with('error', 'Phiếu vật tư không ở trạng thái chờ duyệt');
            }

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt phiếu vật tư');
            }

            DB::commit();
            Log::info('CRM: Đã duyệt phiếu vật tư', ['bill_id' => $id, 'user_id' => $user->id]);
            return back()->with('success', "Đã duyệt phiếu vật tư \"{$bill->bill_number}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Error approving material bill', ['bill_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt phiếu vật tư');
        }
    }

    public function rejectMaterialBill(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $materialBillClass = 'App\\Models\\MaterialBill';
        if (!class_exists($materialBillClass)) {
            return back()->with('error', 'Module Phiếu vật tư chưa được cài đặt');
        }

        $bill = $materialBillClass::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_APPROVE, $bill->project);

        if (!in_array($bill->status, ['pending_management', 'pending_accountant'])) {
            return back()->with('error', 'Phiếu vật tư không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $bill->reject($request->reason, $user);
            DB::commit();
            
            Log::info('CRM: Đã từ chối phiếu vật tư', ['bill_id' => $id, 'user_id' => $user->id]);
            return back()->with('success', "Đã từ chối phiếu vật tư \"{$bill->bill_number}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Error rejecting material bill', ['bill_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối phiếu vật tư');
        }
    }

    // =========================================================================
    // OTHER APPROVALS
    // =========================================================================

    public function approveContract(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $contract = Contract::findOrFail($id);
        $this->crmRequire($user, Permissions::CONTRACT_VIEW, $contract->project);
        try {
            $contract->approve();
            return back()->with('success', 'Đã duyệt hợp đồng');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi khi duyệt hợp đồng');
        }
    }

    public function rejectContract(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $user = Auth::guard('admin')->user();
        $contract = Contract::findOrFail($id);
        $this->crmRequire($user, Permissions::CONTRACT_VIEW, $contract->project);
        $contract->reject($request->reason);
        return back()->with('success', 'Đã từ chối hợp đồng');
    }

    public function approvePayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_APPROVE, $payment->project);
        $payment->approveByCustomer($user);
        return back()->with('success', 'Đã duyệt thanh toán dự án');
    }

    public function confirmProjectPayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_CONFIRM, $payment->project);
        
        try {
            DB::beginTransaction();
            $payment->markAsPaid($user);
            DB::commit();
            return back()->with('success', 'Đã xác nhận thanh toán (Kế toán)');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi xác nhận thanh toán: ' . $e->getMessage());
        }
    }

    public function rejectPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_APPROVE, $payment->project);
        $payment->update([
            'status' => 'pending',
            'notes' => ($payment->notes ? $payment->notes . "\n" : '') . "Từ chối: " . $request->reason
        ]);
        return back()->with('success', 'Đã từ chối thanh toán dự án');
    }

    public function approveBudget(Request $request, $id)
    {
        $budget = ProjectBudget::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $budget->project);
        $budget->update(['status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()]);
        return back()->with('success', 'Đã duyệt ngân sách');
    }

    public function rejectBudget(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $budget = ProjectBudget::findOrFail($id);
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $budget->project);
        $budget->update(['status' => 'draft']);
        return back()->with('success', 'Đã từ chối ngân sách');
    }

    public function approveConstructionLog(Request $request, $id)
    {
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::LOG_APPROVE, $log->project);
        $log->update(['approval_status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()]);
        return back()->with('success', 'Đã duyệt nhật ký');
    }

    public function rejectConstructionLog(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::LOG_APPROVE, $log->project);
        $log->update(['approval_status' => 'rejected', 'rejected_by' => $user->id, 'rejected_at' => now(), 'rejection_reason' => $request->reason]);
        return back()->with('success', 'Đã từ chối nhật ký');
    }

    public function verifyDefectFromApproval(Request $request, $id)
    {
        $defect = Defect::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_VERIFY, $defect->project);
        $defect->markAsVerified($user);
        return back()->with('success', 'Đã xác nhận lỗi đã sửa');
    }

    public function rejectDefectFromApproval(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $defect = Defect::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_VERIFY, $defect->project);
        $defect->update(['status' => 'open', 'rejection_reason' => $request->reason]);
        return back()->with('success', 'Đã từ chối xác nhận lỗi');
    }

    public function approveScheduleAdjustment(Request $request, $id)
    {
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::GANTT_UPDATE, $adj->project);
        $adj->approve($user);
        return back()->with('success', 'Đã duyệt điều chỉnh tiến độ');
    }

    public function rejectScheduleAdjustment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::GANTT_UPDATE, $adj->project);
        $adj->reject($user, $request->reason);
        return back()->with('success', 'Đã từ chối điều chỉnh tiến độ');
    }

    // =========================================================================
    // FORMAT HELPERS
    // =========================================================================

    private function formatItem(Cost $cost): array
    {
        return [
            'id' => $cost->id,
            'type' => 'project_cost',
            'type_label' => 'Chi phí',
            'title' => $cost->name,
            'subtitle' => ($cost->project->code ?? '') . ' - ' . ($cost->project->name ?? 'Dự án'),
            'amount' => (float) $cost->amount,
            'status' => $cost->status,
            'status_label' => $this->getStatusLabel($cost->status),
            'created_by' => $cost->creator->name ?? 'N/A',
            'created_at' => optional($cost->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $cost->description,
            'project_id' => $cost->project_id,
            'attachments' => $cost->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
            'attachments_count' => $cost->attachments->count(),
        ];
    }

    private function formatAcceptanceItem(AcceptanceStage $stage, ?string $statusLabel = null, ?string $approvalLevel = null): array
    {
        return [
            'id' => $stage->id,
            'type' => 'acceptance',
            'type_label' => 'Nghiệm thu',
            'title' => $stage->name,
            'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $stage->status,
            'status_label' => $statusLabel ?? $this->getStatusLabel($stage->status),
            'created_by' => $stage->project?->projectManager?->name ?? 'N/A',
            'created_at' => optional($stage->created_at)->format('d/m/Y H:i') ?? '',
            'description' => $stage->description,
            'project_id' => $stage->project_id,
            'approval_level' => $approvalLevel ?? 'customer',
            'attachments' => $stage->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
            'attachments_count' => $stage->attachments->count(),
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
            'attachments' => $cr->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
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
            'attachments' => $ac->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
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
            'attachments' => $payment->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
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
            'attachments' => $payment->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
            ]),
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
            ]),
            'attachments_count' => $adj->attachments->count(),
        ];
    }

    private function formatDefectItem(Defect $defect): array
    {
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
            'project_id' => $defect->project_id,
            'attachments' => $defect->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
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
            'attachments' => $budget->attachments->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->file_name,
                'url' => $a->file_url,
                'size' => $a->file_size_formatted,
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
            ]),
            'attachments_count' => $rental->attachments->count(),
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
            ]),
            'attachments_count' => $usage->attachments->count(),
        ];
    }

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Nháp',
            'pending' => 'Chờ duyệt',
            'pending_management_approval' => 'Chờ BĐH duyệt',
            'pending_accountant_approval' => 'Chờ KT xác nhận',
            'pending_accountant_confirmation' => 'Chờ KT xác nhận',
            'pending_customer_approval' => 'Chờ KH duyệt',
            'approved' => 'Đã duyệt',
            'paid' => 'Đã thanh toán',
            'rejected' => 'Từ chối',
            'fixed' => 'Đã sửa — Chờ xác nhận',
            'verified' => 'Đã xác nhận',
            default => $status,
        };
    }
}
