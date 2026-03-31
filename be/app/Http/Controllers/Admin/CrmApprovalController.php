<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CrmApprovalController extends Controller
{
    /**
     * Display the Approval Center page — grouped by approval level.
     */
    public function index(Request $request)
    {
        // ─── Management Level (BĐH) — Show All (Draft, Pending, Management, Rejected) ───
        $managementItems = Cost::whereIn('status', ['draft', 'pending', 'pending_management_approval', 'rejected'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $managementItemsFormatted = $managementItems->map(fn(Cost $cost) => $this->formatItem($cost));

        // ─── Accountant Level (KT) — Show All (Accountant, Approved, Rejected) ───
        $accountantItems = Cost::whereIn('status', ['pending_accountant_approval', 'approved', 'rejected'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $accountantItemsFormatted = $accountantItems->map(fn(Cost $cost) => $this->formatItem($cost));

        // ─── Nghiệm thu chờ GS duyệt ───
        $acceptanceSupervisorItems = AcceptanceStage::where('status', 'pending')
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $acceptanceSupervisorItemsFormatted = $acceptanceSupervisorItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ GS duyệt', 'supervisor'));

        // ─── Nghiệm thu chờ QLDA duyệt ───
        $acceptancePMItems = AcceptanceStage::where('status', 'supervisor_approved')
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'supervisorApprover:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $acceptancePMItemsFormatted = $acceptancePMItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ QLDA duyệt', 'project_manager'));

        // ─── Customer Acceptance (Khách hàng duyệt nghiệm thu) ───
        $customerAcceptanceItems = AcceptanceStage::where('status', 'project_manager_approved')
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'projectManagerApprover:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $customerAcceptanceItemsFormatted = $customerAcceptanceItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ KH duyệt', 'customer'));

        // ─── Change Requests — Show All ───
        $changeRequestItems = ChangeRequest::whereIn('status', ['submitted', 'under_review', 'rejected'])
            ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $changeRequestItemsFormatted = $changeRequestItems->map(fn(ChangeRequest $cr) => $this->formatChangeRequestItem($cr));

        // ─── Additional Costs — Show All ───
        $additionalCostItems = AdditionalCost::whereIn('status', ['pending', 'pending_approval', 'rejected'])
            ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $additionalCostItemsFormatted = $additionalCostItems->map(fn(AdditionalCost $ac) => $this->formatAdditionalCostItem($ac));

        // ─── Subcontractor Payments chờ duyệt ───
        $subPaymentManagement = SubcontractorPayment::whereIn('status', ['pending_management_approval', 'rejected'])
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subPaymentManagementFormatted = $subPaymentManagement->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));

        $subPaymentAccountant = SubcontractorPayment::where('status', 'pending_accountant_confirmation')
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subPaymentAccountantFormatted = $subPaymentAccountant->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));

        // ─── Hợp đồng chờ Khách hàng duyệt ───
        $contractItems = Contract::where('status', 'pending_customer_approval')
            ->with(['project:id,name,code', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $contractItemsFormatted = $contractItems->map(fn(Contract $c) => $this->formatContractItem($c));

        // ─── Thanh toán dự án chờ Khách hàng duyệt ───
        $pendingPaymentItems = ProjectPayment::where('status', 'customer_pending_approval')
            ->with(['project:id,name,code', 'contract:id,contract_value', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $pendingPaymentItemsFormatted = $pendingPaymentItems->map(fn(ProjectPayment $p) => $this->formatPaymentItem($p));

        // ─── Thanh toán dự án khách đã trả (Chờ KT xác nhận) ───
        $paidPaymentItems = ProjectPayment::where('status', 'customer_paid')
            ->with(['project:id,name,code', 'contract:id,contract_value', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $paidPaymentItemsFormatted = $paidPaymentItems->map(fn(ProjectPayment $p) => $this->formatPaymentItem($p));

        // ─── Phiếu vật tư chờ duyệt ───
        $materialBillManagementItemsFormatted = collect();
        $materialBillAccountantItemsFormatted = collect();
        $materialBillClass = 'App\\Models\\MaterialBill';
        if (class_exists($materialBillClass)) {
            $materialBillManagementItemsFormatted = $materialBillClass::whereIn('status', ['draft', 'pending', 'pending_management', 'rejected'])
                ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));

            $materialBillAccountantItemsFormatted = $materialBillClass::where('status', 'pending_accountant')
                ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));
        }

        // ─── Nghiệm thu NTP chờ duyệt ───
        $subAcceptanceItems = SubcontractorAcceptance::where('status', 'pending')
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subAcceptanceItemsFormatted = $subAcceptanceItems->map(fn(SubcontractorAcceptance $sa) => $this->formatSubAcceptanceItem($sa));

        // ─── Nghiệm thu NCC chờ duyệt ───
        $supplierAcceptanceItems = SupplierAcceptance::where('status', 'pending')
            ->with(['supplier:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $supplierAcceptanceItemsFormatted = $supplierAcceptanceItems->map(fn(SupplierAcceptance $sa) => $this->formatSupplierAcceptanceItem($sa));

        // ─── Nhật ký công trường — Show All ───
        $constructionLogItems = ConstructionLog::whereIn('approval_status', ['pending', 'rejected'])
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
            ->orderBy('log_date', 'desc')
            ->get();
        $constructionLogItemsFormatted = $constructionLogItems->map(fn(ConstructionLog $log) => $this->formatConstructionLogItem($log));

        // ─── Điều chỉnh tiến độ chờ duyệt ───
        $scheduleAdjustmentItems = ScheduleAdjustment::where('status', 'pending')
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $scheduleAdjustmentItemsFormatted = $scheduleAdjustmentItems->map(fn(ScheduleAdjustment $adj) => $this->formatScheduleAdjustmentItem($adj));

        // ─── Lỗi nghiệm thu chờ xác nhận (fixed → chờ GS/QLDA verify) ───
        $defectItems = Defect::where('status', 'fixed')
            ->with(['project:id,name,code', 'reporter:id,name', 'fixer:id,name', 'task:id,name', 'acceptanceStage:id,name', 'attachments'])
            ->orderBy('fixed_at', 'desc')
            ->get();
        $defectItemsFormatted = $defectItems->map(fn(Defect $d) => $this->formatDefectItem($d));

        // ─── Project Budgets (Ngân sách chưa duyệt) ───
        $budgetItems = ProjectBudget::where('status', 'draft')
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $budgetItemsFormatted = $budgetItems->map(fn(ProjectBudget $b) => $this->formatBudget($b));

        // ─── Recently processed feed ───
        $recentCosts = Cost::whereIn('status', ['approved', 'rejected'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get();

        $recentCR = ChangeRequest::whereIn('status', ['approved', 'rejected'])
            ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAC = AdditionalCost::whereIn('status', ['approved', 'rejected'])
            ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentSubPayments = SubcontractorPayment::whereIn('status', ['paid', 'rejected'])
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAcceptances = AcceptanceStage::whereIn('status', ['customer_approved', 'rejected'])
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentBudgets = ProjectBudget::whereIn('status', ['approved', 'rejected'])
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentItems = collect([])
            ->concat($recentCosts->map(fn(Cost $item) => $this->formatItem($item)))
            ->concat($recentCR->map(fn(ChangeRequest $item) => $this->formatChangeRequestItem($item)))
            ->concat($recentAC->map(fn(AdditionalCost $item) => $this->formatAdditionalCostItem($item)))
            ->concat($recentSubPayments->map(fn(SubcontractorPayment $item) => $this->formatSubPaymentItem($item)))
            ->concat($recentAcceptances->map(fn(AcceptanceStage $item) => $this->formatAcceptanceItem($item, 'Nghiệm thu', 'customer')))
            ->concat($recentBudgets->map(fn(ProjectBudget $item) => $this->formatBudget($item)))
            ->sortByDesc('created_at')
            ->take(30)
            ->values();

        // ─── Actually Pending Stats (Exclude Draft/Rejected for KPIs) ───
        $realPendingManagement = Cost::whereIn('status', ['pending', 'pending_management_approval'])->count();
        $realPendingAccountant = Cost::whereIn('status', ['pending_accountant_approval'])->count();
        $realPendingAcceptance = AcceptanceStage::whereIn('status', ['pending', 'supervisor_approved', 'project_manager_approved'])->count();
        
        $stats = [
            'pending_management' => $realPendingManagement,
            'pending_accountant' => $realPendingAccountant,
            'pending_acceptance' => $realPendingAcceptance,
            'pending_others' => $changeRequestItems->count() + $additionalCostItems->count() + $subPaymentManagement->count() + $materialBillManagementItemsFormatted->count(),
            'approved_today' => Cost::where('status', 'approved')->whereDate('updated_at', today())->count(),
            'rejected_today' => Cost::where('status', 'rejected')->whereDate('updated_at', today())->count(),
            'total_pending_amount' => Cost::whereIn('status', ['pending', 'pending_management_approval', 'pending_accountant_approval'])->sum('amount'),
        ];

        return Inertia::render('Crm/Approvals/Index', [
            'managementItems' => $managementItemsFormatted->values(),
            'accountantItems' => $accountantItemsFormatted->values(),
            'acceptanceSupervisorItems' => $acceptanceSupervisorItemsFormatted->values(),
            'acceptancePMItems' => $acceptancePMItemsFormatted->values(),
            'customerAcceptanceItems' => $customerAcceptanceItemsFormatted->values(),
            'changeRequestItems' => $changeRequestItemsFormatted->values(),
            'additionalCostItems' => $additionalCostItemsFormatted->values(),
            'subPaymentManagementItems' => $subPaymentManagementFormatted->values(),
            'subPaymentAccountantItems' => $subPaymentAccountantFormatted->values(),
            'contractItems' => $contractItemsFormatted->values(),
            'pendingPaymentItems' => $pendingPaymentItemsFormatted->values(),
            'paidPaymentItems' => $paidPaymentItemsFormatted->values(),
            'materialBillManagementItems' => $materialBillManagementItemsFormatted->values(),
            'materialBillAccountantItems' => $materialBillAccountantItemsFormatted->values(),
            'subAcceptanceItems' => $subAcceptanceItemsFormatted->values(),
            'supplierAcceptanceItems' => $supplierAcceptanceItemsFormatted->values(),
            'constructionLogItems' => $constructionLogItemsFormatted->values(),
            'scheduleAdjustmentItems' => $scheduleAdjustmentItemsFormatted->values(),
            'defectItems' => $defectItemsFormatted->values(),
            'budgetItems' => $budgetItemsFormatted->values(),
            'recentItems' => $recentItems,
            'stats' => $stats,
        ]);
    }

    // =========================================================================
    // COST APPROVAL
    // =========================================================================

    public function approveManagement(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cost->status, ['draft', 'pending', 'pending_management_approval', 'rejected'])) {
            return back()->with('error', 'Chi phí không ở trạng thái có thể duyệt');
        }

        try {
            DB::beginTransaction();

            $result = $cost->approveByManagement($user);

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt chi phí này — trạng thái không hợp lệ');
            }

            DB::commit();

            Log::info('CRM: BĐH approved cost', [
                'cost_id' => $cost->id,
                'approved_by' => $user->id,
                'amount' => $cost->amount,
            ]);

            return back()->with('success', "Đã duyệt chi phí \"{$cost->name}\" (Ban điều hành)");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Cost approval failed', ['cost_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt chi phí');
        }
    }

    public function approveAccountant(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($cost->status !== 'pending_accountant_approval') {
            return back()->with('error', 'Chi phí không ở trạng thái chờ KT xác nhận');
        }

        // Financial Gatekeeper: Ensure attachments exist for financial flow
        if ($cost->attachments()->count() === 0) {
            return back()->with('error', 'Yêu cầu thanh toán bắt buộc phải có file chứng từ đi kèm mới có thể xác nhận.');
        }

        try {
            DB::beginTransaction();
            $result = $cost->approveByAccountant($user);

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể xác nhận chi phí này — trạng thái không hợp lệ');
            }

            DB::commit();

            Log::info('CRM: KT confirmed cost', [
                'cost_id' => $cost->id,
                'confirmed_by' => $user->id,
                'amount' => $cost->amount,
            ]);

            return back()->with('success', "Đã xác nhận chi phí \"{$cost->name}\" (Kế toán)");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Cost accountant approval failed', ['cost_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi xác nhận chi phí');
        }
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return back()->with('error', 'Chi phí không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $cost->reject($request->reason, $user);

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể từ chối chi phí này');
            }

            DB::commit();

            Log::info('CRM: Cost rejected', [
                'cost_id' => $cost->id,
                'rejected_by' => $user->id,
                'reason' => $request->reason,
            ]);

            return back()->with('success', "Đã từ chối chi phí \"{$cost->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Cost rejection failed', ['cost_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối chi phí');
        }
    }

    // =========================================================================
    // ACCEPTANCE APPROVAL (GS, QLDA, Customer)
    // =========================================================================

    public function approveSupervisorAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'pending') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái chờ GS duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $stage->approveSupervisor($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt nghiệm thu (GS)');
            }
            DB::commit();
            return back()->with('success', "GS đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu (GS)');
        }
    }

    public function approvePMAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'supervisor_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái chờ QLDA duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $stage->approveProjectManager($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt nghiệm thu (QLDA)');
            }
            DB::commit();
            return back()->with('success', "QLDA đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu (QLDA)');
        }
    }

    public function approveCustomerAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

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
        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();
            $result = $cr->approve($user, $request->input('notes'));
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt yêu cầu thay đổi');
            }
            DB::commit();
            return back()->with('success', "Đã duyệt yêu cầu thay đổi \"{$cr->title}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt yêu cầu thay đổi');
        }
    }

    public function rejectChangeRequest(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();
            $cr->reject($user, $request->reason);
            DB::commit();
            return back()->with('success', "Đã từ chối yêu cầu thay đổi \"{$cr->title}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối yêu cầu thay đổi');
        }
    }

    // =========================================================================
    // ADDITIONAL COST APPROVAL
    // =========================================================================

    public function approveAdditionalCost(Request $request, $id)
    {
        $ac = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();
            $result = $ac->approve($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt chi phí phát sinh');
            }
            DB::commit();
            return back()->with('success', 'Đã duyệt chi phí phát sinh');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt chi phí phát sinh');
        }
    }

    public function rejectAdditionalCost(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $ac = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();
            $ac->reject($request->reason, $user);
            DB::commit();
            return back()->with('success', 'Đã từ chối chi phí phát sinh');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối chi phí phát sinh');
        }
    }

    // =========================================================================
    // SUBCONTRACTOR PAYMENT
    // =========================================================================

    public function approveSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();

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
        $contract = Contract::findOrFail($id);
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
        $contract = Contract::findOrFail($id);
        $contract->reject($request->reason);
        return back()->with('success', 'Đã từ chối hợp đồng');
    }

    public function approvePayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $payment->approveByCustomer($user);
        return back()->with('success', 'Đã duyệt thanh toán dự án');
    }

    public function confirmProjectPayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        
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
        $budget->update(['status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()]);
        return back()->with('success', 'Đã duyệt ngân sách');
    }

    public function rejectBudget(Request $request, $id)
    {
        $budget = ProjectBudget::findOrFail($id);
        $budget->update(['status' => 'draft']);
        return back()->with('success', 'Đã từ chối ngân sách');
    }

    public function approveConstructionLog(Request $request, $id)
    {
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $log->update(['approval_status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()]);
        return back()->with('success', 'Đã duyệt nhật ký');
    }

    public function rejectConstructionLog(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $log->update(['approval_status' => 'rejected', 'rejected_by' => $user->id, 'rejected_at' => now(), 'rejection_reason' => $request->reason]);
        return back()->with('success', 'Đã từ chối nhật ký');
    }

    public function verifyDefectFromApproval(Request $request, $id)
    {
        $defect = Defect::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $defect->markAsVerified($user);
        return back()->with('success', 'Đã xác nhận lỗi đã sửa');
    }

    public function rejectDefectFromApproval(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $defect = Defect::findOrFail($id);
        $defect->update(['status' => 'open', 'rejection_reason' => $request->reason]);
        return back()->with('success', 'Đã từ chối xác nhận lỗi');
    }

    public function approveScheduleAdjustment(Request $request, $id)
    {
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $adj->approve($user);
        return back()->with('success', 'Đã duyệt điều chỉnh tiến độ');
    }

    public function rejectScheduleAdjustment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();
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
