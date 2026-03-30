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
        $user = Auth::guard('admin')->user();

        // ─── Management Level (BĐH) ───
        $managementItems = Cost::whereIn('status', ['pending_management_approval'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($cost) => $this->formatItem($cost));

        // ─── Accountant Level (KT) ───
        $accountantItems = Cost::whereIn('status', ['pending_accountant_approval'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($cost) => $this->formatItem($cost));

        // ─── Nghiệm thu chờ GS duyệt ───
        $acceptanceSupervisorItems = AcceptanceStage::where('status', 'pending')
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($stage) => $this->formatAcceptanceItem($stage, 'Chờ GS duyệt', 'supervisor'));

        // ─── Nghiệm thu chờ QLDA duyệt ───
        $acceptancePMItems = AcceptanceStage::where('status', 'supervisor_approved')
            ->with(['project:id,name,code', 'supervisorApprover:id,name', 'task:id,name'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($stage) => $this->formatAcceptanceItem($stage, 'Chờ QLDA duyệt', 'project_manager'));

        // ─── Customer Acceptance (Khách hàng duyệt nghiệm thu) ───
        $customerAcceptanceItems = AcceptanceStage::where('status', 'project_manager_approved')
            ->with(['project:id,name,code', 'projectManagerApprover:id,name', 'task:id,name'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($stage) => $this->formatAcceptanceItem($stage, 'Chờ KH duyệt', 'customer'));

        // ─── Change Requests chờ duyệt ───
        $changeRequestItems = ChangeRequest::whereIn('status', ['submitted', 'under_review'])
            ->with(['project:id,name,code', 'requester:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($cr) => $this->formatChangeRequestItem($cr));

        // ─── Additional Costs chờ duyệt ───
        $additionalCostItems = AdditionalCost::whereIn('status', ['pending', 'pending_approval'])
            ->with(['project:id,name,code', 'proposer:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($ac) => $this->formatAdditionalCostItem($ac));

        // ─── Subcontractor Payments chờ duyệt ───
        $subPaymentManagement = SubcontractorPayment::where('status', 'pending_management_approval')
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatSubPaymentItem($p));

        $subPaymentAccountant = SubcontractorPayment::where('status', 'pending_accountant_confirmation')
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatSubPaymentItem($p));

        // ─── Hợp đồng chờ Khách hàng duyệt ───
        $contractItems = Contract::where('status', 'pending_customer_approval')
            ->with(['project:id,name,code'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($c) => $this->formatContractItem($c));

        // ─── Thanh toán dự án chờ Khách hàng duyệt ───
        $paymentItems = ProjectPayment::where('status', 'customer_pending_approval')
            ->with(['project:id,name,code', 'contract:id,contract_value'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatPaymentItem($p));

        // ─── Phiếu vật tư chờ duyệt (BĐH) ───
        $materialBillManagementItems = collect();
        $materialBillAccountantItems = collect();
        $materialBillClass = 'App\\Models\\MaterialBill';
        if (class_exists($materialBillClass)) {
            $materialBillManagementItems = $materialBillClass::where('status', 'pending_management')
                ->with(['creator:id,name,email', 'project:id,name,code'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));

            $materialBillAccountantItems = $materialBillClass::where('status', 'pending_accountant')
                ->with(['creator:id,name,email', 'project:id,name,code'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));
        }

        // ─── Nghiệm thu NTP chờ duyệt ───
        $subAcceptanceItems = SubcontractorAcceptance::where('status', 'pending')
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($sa) => $this->formatSubAcceptanceItem($sa));

        // ─── Nghiệm thu NCC chờ duyệt ───
        $supplierAcceptanceItems = SupplierAcceptance::where('status', 'pending')
            ->with(['supplier:id,name', 'project:id,name,code', 'creator:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($sa) => $this->formatSupplierAcceptanceItem($sa));

        // ─── Nhật ký công trường chờ duyệt ───
        $constructionLogItems = ConstructionLog::where('approval_status', 'pending')
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name'])
            ->orderBy('log_date', 'desc')
            ->get()
            ->map(fn($log) => $this->formatConstructionLogItem($log));

        // ─── Điều chỉnh tiến độ chờ duyệt ───
        $scheduleAdjustmentItems = ScheduleAdjustment::where('status', 'pending')
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($adj) => $this->formatScheduleAdjustmentItem($adj));

        // ─── Recently processed (last 30 items — ALL types) ───
        $recentCosts = Cost::whereIn('status', ['approved', 'rejected'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get()
            ->map(fn($cost) => $this->formatItem($cost));

        $recentCR = ChangeRequest::whereIn('status', ['approved', 'rejected'])
            ->with(['project:id,name,code', 'requester:id,name,email'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($cr) => $this->formatChangeRequestItem($cr));

        $recentAC = AdditionalCost::whereIn('status', ['approved', 'rejected'])
            ->with(['project:id,name,code', 'proposer:id,name,email'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($ac) => $this->formatAdditionalCostItem($ac));

        $recentSubPayments = SubcontractorPayment::whereIn('status', ['paid', 'rejected'])
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($p) => $this->formatSubPaymentItem($p));

        $recentAcceptances = AcceptanceStage::whereIn('status', ['customer_approved', 'rejected'])
            ->with(['project:id,name,code', 'task:id,name'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($stage) => $this->formatAcceptanceItem($stage));

        $recentItems = $recentCosts->merge($recentCR)->merge($recentAC)->merge($recentSubPayments)->merge($recentAcceptances)
            ->sortByDesc('created_at')
            ->take(30)
            ->values();

        // ─── Stats ───
        $stats = [
            'pending_management' => $managementItems->count(),
            'pending_accountant' => $accountantItems->count(),
            'pending_acceptance_supervisor' => $acceptanceSupervisorItems->count(),
            'pending_acceptance_pm' => $acceptancePMItems->count(),
            'pending_customer' => $customerAcceptanceItems->count(),
            'pending_change_request' => $changeRequestItems->count(),
            'pending_additional_cost' => $additionalCostItems->count(),
            'pending_sub_payment' => $subPaymentManagement->count() + $subPaymentAccountant->count(),
            'pending_contract' => $contractItems->count(),
            'pending_payment' => $paymentItems->count(),
            'pending_material_bill' => $materialBillManagementItems->count() + $materialBillAccountantItems->count(),
            'pending_sub_acceptance' => $subAcceptanceItems->count(),
            'pending_supplier_acceptance' => $supplierAcceptanceItems->count(),
            'pending_construction_log' => $constructionLogItems->count(),
            'pending_schedule_adjustment' => $scheduleAdjustmentItems->count(),
            'approved_today' => Cost::where('status', 'approved')
                ->whereDate('updated_at', today())
                ->count(),
            'rejected_today' => Cost::where('status', 'rejected')
                ->whereDate('updated_at', today())
                ->count(),
            'total_pending_amount' => $managementItems->sum('amount') + $accountantItems->sum('amount'),
        ];

        return Inertia::render('Crm/Approvals/Index', [
            'managementItems' => $managementItems->values(),
            'accountantItems' => $accountantItems->values(),
            'acceptanceSupervisorItems' => $acceptanceSupervisorItems->values(),
            'acceptancePMItems' => $acceptancePMItems->values(),
            'customerAcceptanceItems' => $customerAcceptanceItems->values(),
            'changeRequestItems' => $changeRequestItems->values(),
            'additionalCostItems' => $additionalCostItems->values(),
            'subPaymentManagementItems' => $subPaymentManagement->values(),
            'subPaymentAccountantItems' => $subPaymentAccountant->values(),
            'contractItems' => $contractItems->values(),
            'paymentItems' => $paymentItems->values(),
            'materialBillManagementItems' => $materialBillManagementItems->values(),
            'materialBillAccountantItems' => $materialBillAccountantItems->values(),
            'subAcceptanceItems' => $subAcceptanceItems->values(),
            'supplierAcceptanceItems' => $supplierAcceptanceItems->values(),
            'constructionLogItems' => $constructionLogItems->values(),
            'scheduleAdjustmentItems' => $scheduleAdjustmentItems->values(),
            'recentItems' => $recentItems->values(),
            'stats' => $stats,
        ]);
    }

    // =========================================================================
    // COST APPROVAL (BĐH → Kế Toán)
    // Flow: draft → pending_management_approval → pending_accountant_approval → approved
    // =========================================================================

    /**
     * BĐH duyệt chi phí.
     * CRITICAL: Dùng model method để đảm bảo ghi lại AI DUYỆT + timestamp.
     */
    public function approveManagement(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($cost->status !== 'pending_management_approval') {
            return back()->with('error', 'Chi phí không ở trạng thái chờ BĐH duyệt');
        }

        try {
            DB::beginTransaction();

            // Dùng model method — ghi nhận user + timestamp đúng cách
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

    /**
     * Kế Toán xác nhận chi phí.
     * CRITICAL: Dùng model method — triggers budget sync, material transactions, subcontractor update.
     */
    public function approveAccountant(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($cost->status !== 'pending_accountant_approval') {
            return back()->with('error', 'Chi phí không ở trạng thái chờ KT xác nhận');
        }

        try {
            DB::beginTransaction();

            // CRITICAL: Phải dùng model method vì nó:
            // 1. Ghi nhận user + timestamp
            // 2. Tự động cập nhật subcontractor total_paid
            // 3. Tự động tạo MaterialTransaction
            // 4. Tự động sync budget items
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

    /**
     * Từ chối chi phí (từ cả BĐH hoặc KT).
     * CRITICAL: Phải dùng model method vì nó:
     * 1. Rollback subcontractor total_paid nếu cost đã approved
     * 2. Xóa MaterialTransaction nếu đã tạo
     * 3. Cập nhật budget items
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $cost = Cost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return back()->with('error', 'Chi phí không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();

            // CRITICAL: Dùng model method — xử lý rollback subcontractor, material, budget
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
    // CUSTOMER ACCEPTANCE APPROVAL
    // Flow: pending → supervisor_approved → project_manager_approved → customer_approved
    // =========================================================================

    public function approveCustomerAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'project_manager_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái chờ khách hàng duyệt');
        }

        try {
            DB::beginTransaction();

            // Model method: creates acceptance items, updates project progress
            $result = $stage->approveCustomer($user);

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt nghiệm thu này');
            }

            DB::commit();

            Log::info('CRM: Customer accepted stage', [
                'stage_id' => $stage->id,
                'approved_by' => $user->id,
            ]);

            return back()->with('success', "Khách hàng đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Acceptance approval failed', ['stage_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu');
        }
    }

    public function rejectCustomerAcceptance(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'project_manager_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái có thể từ chối');
        }

        try {
            DB::beginTransaction();

            // Model method: auto-creates defect record
            $stage->reject($request->reason, $user);

            DB::commit();

            Log::info('CRM: Customer rejected acceptance', [
                'stage_id' => $stage->id,
                'rejected_by' => $user->id,
            ]);

            return back()->with('success', "Đã từ chối nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Acceptance rejection failed', ['stage_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu');
        }
    }

    // =========================================================================
    // SUPERVISOR & PM ACCEPTANCE APPROVAL
    // Flow: pending → supervisor_approved → project_manager_approved → customer_approved
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
            Log::info('CRM: GS approved acceptance', ['stage_id' => $stage->id, 'approved_by' => $user->id]);
            return back()->with('success', "GS đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Supervisor acceptance approval failed', ['stage_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu (GS)');
        }
    }

    public function rejectSupervisorAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'pending') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái có thể từ chối');
        }

        try {
            DB::beginTransaction();
            $stage->reject($request->reason, $user);
            DB::commit();
            return back()->with('success', "Đã từ chối nghiệm thu \"{$stage->name}\" (GS)");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu');
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
            Log::info('CRM: PM approved acceptance', ['stage_id' => $stage->id, 'approved_by' => $user->id]);
            return back()->with('success', "QLDA đã duyệt nghiệm thu \"{$stage->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: PM acceptance approval failed', ['stage_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu (QLDA)');
        }
    }

    public function rejectPMAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'supervisor_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái có thể từ chối');
        }

        try {
            DB::beginTransaction();
            $stage->reject($request->reason, $user);
            DB::commit();
            return back()->with('success', "Đã từ chối nghiệm thu \"{$stage->name}\" (QLDA)");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu');
        }
    }

    // =========================================================================
    // CHANGE REQUEST APPROVAL
    // Flow: draft → submitted → (under_review) → approved/rejected → implemented
    // =========================================================================

    public function approveChangeRequest(Request $request, $id)
    {
        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cr->status, ['submitted', 'under_review'])) {
            return back()->with('error', 'Yêu cầu thay đổi không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();

            $result = $cr->approve($user, $request->input('notes'));

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt yêu cầu thay đổi này');
            }

            DB::commit();

            Log::info('CRM: Change request approved', [
                'cr_id' => $cr->id,
                'approved_by' => $user->id,
                'cost_impact' => $cr->estimated_cost_impact,
            ]);

            return back()->with('success', "Đã duyệt yêu cầu thay đổi \"{$cr->title}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: CR approval failed', ['cr_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt yêu cầu thay đổi');
        }
    }

    public function rejectChangeRequest(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cr->status, ['submitted', 'under_review'])) {
            return back()->with('error', 'Yêu cầu thay đổi không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();

            $cr->reject($user, $request->reason);

            DB::commit();

            Log::info('CRM: Change request rejected', [
                'cr_id' => $cr->id,
                'rejected_by' => $user->id,
            ]);

            return back()->with('success', "Đã từ chối yêu cầu thay đổi \"{$cr->title}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: CR rejection failed', ['cr_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối yêu cầu thay đổi');
        }
    }

    // =========================================================================
    // ADDITIONAL COST APPROVAL
    // Flow: pending/pending_approval → approved/rejected → customer_paid → confirmed
    // =========================================================================

    public function approveAdditionalCost(Request $request, $id)
    {
        $ac = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($ac->status, ['pending', 'pending_approval'])) {
            return back()->with('error', 'Chi phí phát sinh không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();

            // FIX BUG 5: Handle 'pending' status directly in approve() without intermediate save
            // The model's approve() method now handles 'pending' → 'approved' directly
            $result = $ac->approve($user);

            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt chi phí phát sinh này');
            }

            DB::commit();

            Log::info('CRM: Additional cost approved', [
                'ac_id' => $ac->id,
                'approved_by' => $user->id,
                'amount' => $ac->amount,
            ]);

            return back()->with('success', "Đã duyệt chi phí phát sinh");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Additional cost approval failed', ['ac_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt chi phí phát sinh');
        }
    }

    public function rejectAdditionalCost(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $ac = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($ac->status, ['pending', 'pending_approval'])) {
            return back()->with('error', 'Chi phí phát sinh không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();

            $ac->reject($request->reason, $user);

            DB::commit();

            Log::info('CRM: Additional cost rejected', [
                'ac_id' => $ac->id,
                'rejected_by' => $user->id,
            ]);

            return back()->with('success', "Đã từ chối chi phí phát sinh");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Additional cost rejection failed', ['ac_id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối chi phí phát sinh');
        }
    }

    // =========================================================================
    // SUBCONTRACTOR PAYMENT APPROVAL
    // Flow: draft → pending_management_approval → pending_accountant_confirmation → paid
    // =========================================================================

    public function approveSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($payment->status !== 'pending_management_approval') {
            return back()->with('error', 'Phiếu thanh toán NTP không ở trạng thái chờ BĐH duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $payment->approve($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt phiếu thanh toán NTP');
            }
            DB::commit();

            Log::info('CRM: BĐH approved sub payment', [
                'payment_id' => $payment->id,
                'approved_by' => $user->id,
                'amount' => $payment->amount,
            ]);

            return back()->with('success', "Đã duyệt thanh toán NTP (Ban điều hành)");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Sub payment approval failed', ['id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt thanh toán NTP');
        }
    }

    public function confirmSubPayment(Request $request, $id)
    {
        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($payment->status !== 'pending_accountant_confirmation') {
            return back()->with('error', 'Phiếu thanh toán NTP không ở trạng thái chờ KT xác nhận');
        }

        try {
            DB::beginTransaction();
            $result = $payment->markAsPaid($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể xác nhận thanh toán NTP');
            }
            DB::commit();

            Log::info('CRM: KT confirmed sub payment', [
                'payment_id' => $payment->id,
                'paid_by' => $user->id,
                'amount' => $payment->amount,
            ]);

            return back()->with('success', "Đã xác nhận thanh toán NTP (Kế toán)");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Sub payment confirm failed', ['id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi xác nhận thanh toán NTP');
        }
    }

    public function rejectSubPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $payment = SubcontractorPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($payment->status, ['pending_management_approval', 'pending_accountant_confirmation'])) {
            return back()->with('error', 'Phiếu thanh toán NTP không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $payment->reject($user, $request->reason);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể từ chối thanh toán NTP');
            }
            DB::commit();

            Log::info('CRM: Sub payment rejected', [
                'payment_id' => $payment->id,
                'rejected_by' => $user->id,
                'reason' => $request->reason,
            ]);

            return back()->with('success', 'Đã từ chối thanh toán NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Sub payment reject failed', ['id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi từ chối thanh toán NTP');
        }
    }

    // =========================================================================
    // Format Functions
    // =========================================================================

    private function formatItem(Cost $cost): array
    {
        $isProject = $cost->project_id !== null;

        return [
            'id' => $cost->id,
            'type' => $isProject ? 'project_cost' : 'company_cost',
            'type_label' => $isProject ? 'CP Dự án' : 'CP Công ty',
            'title' => $cost->name,
            'subtitle' => $isProject
                ? (($cost->project->code ?? '') . ' - ' . ($cost->project->name ?? 'Dự án'))
                : ($cost->costGroup->name ?? 'Không phân nhóm'),
            'amount' => (float) $cost->amount,
            'status' => $cost->status,
            'status_label' => $this->getStatusLabel($cost->status),
            'created_by' => $cost->creator->name ?? 'N/A',
            'created_by_email' => $cost->creator->email ?? '',
            'created_at' => $cost->created_at->format('d/m/Y H:i'),
            'cost_date' => $cost->cost_date,
            'description' => $cost->description,
            'project_name' => $cost->project->name ?? null,
            'project_id' => $cost->project_id,
            'management_approved_by' => $cost->managementApprover->name ?? null,
            'management_approved_at' => $cost->management_approved_at?->format('d/m/Y H:i'),
            'rejected_reason' => $cost->rejected_reason ?? null,
            'approval_level' => match ($cost->status) {
                'pending_management_approval' => 'management',
                'pending_accountant_approval' => 'accountant',
                default => 'done',
            },
        ];
    }

    private function formatAcceptanceItem(AcceptanceStage $stage, ?string $statusLabel = null, ?string $approvalLevel = null): array
    {
        $creatorName = $stage->project?->projectManager?->name ?? ($stage->projectManagerApprover?->name ?? ($stage->supervisorApprover?->name ?? 'N/A'));

        return [
            'id' => $stage->id,
            'type' => 'acceptance',
            'type_label' => 'Nghiệm thu',
            'title' => $stage->name,
            'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $stage->status,
            'status_label' => $statusLabel ?? $this->getStatusLabel($stage->status),
            'created_by' => $creatorName,
            'created_by_email' => '',
            'created_at' => $stage->updated_at?->format('d/m/Y H:i') ?? $stage->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $stage->description,
            'project_name' => $stage->project->name ?? null,
            'project_id' => $stage->project_id,
            'task_name' => $stage->task->name ?? null,
            'approval_level' => $approvalLevel ?? 'customer',
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
            'amount' => (float) ($cr->estimated_cost_impact ?? 0),
            'status' => $cr->status,
            'status_label' => 'Chờ phê duyệt',
            'created_by' => $cr->requester->name ?? 'N/A',
            'created_by_email' => $cr->requester->email ?? '',
            'created_at' => $cr->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $cr->description,
            'project_name' => $cr->project->name ?? null,
            'project_id' => $cr->project_id,
            'change_type' => $cr->change_type,
            'priority' => $cr->priority,
            'approval_level' => 'change_request',
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
            'amount' => (float) ($ac->amount ?? 0),
            'status' => $ac->status,
            'status_label' => 'Chờ BĐH duyệt',
            'created_by' => $ac->proposer->name ?? 'N/A',
            'created_by_email' => $ac->proposer->email ?? '',
            'created_at' => $ac->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $ac->description,
            'project_name' => $ac->project->name ?? null,
            'project_id' => $ac->project_id,
            'approval_level' => 'additional_cost',
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
            'status_label' => match ($payment->status) {
                'pending_management_approval' => 'Chờ BĐH duyệt',
                'pending_accountant_confirmation' => 'Chờ KT xác nhận',
                default => $payment->status,
            },
            'created_by' => $payment->creator->name ?? 'N/A',
            'created_by_email' => $payment->creator->email ?? '',
            'created_at' => $payment->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $payment->description ?? ('Đợt: ' . ($payment->payment_stage ?? 'N/A')),
            'project_name' => $payment->project->name ?? null,
            'project_id' => $payment->project_id,
            'payment_method' => $payment->payment_method,
            'subcontractor_name' => $payment->subcontractor->name ?? null,
            'management_approved_by' => $payment->approver->name ?? null,
            'approval_level' => match ($payment->status) {
                'pending_management_approval' => 'management',
                'pending_accountant_confirmation' => 'accountant',
                default => 'done',
            },
        ];
    }

    private function formatContractItem(Contract $contract): array
    {
        return [
            'id' => $contract->id,
            'type' => 'contract',
            'type_label' => 'Hợp đồng',
            'title' => $contract->name ?? "HĐ #{$contract->id}",
            'subtitle' => ($contract->project->code ?? '') . ' - ' . ($contract->project->name ?? 'Dự án'),
            'amount' => (float) ($contract->total_value ?? 0),
            'status' => $contract->status,
            'status_label' => 'Chờ KH duyệt',
            'created_by' => 'Hệ thống',
            'created_by_email' => '',
            'created_at' => $contract->updated_at?->format('d/m/Y H:i') ?? '',
            'description' => $contract->description ?? null,
            'project_name' => $contract->project->name ?? null,
            'project_id' => $contract->project_id,
            'approval_level' => 'contract',
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
            'amount' => (float) ($payment->amount ?? 0),
            'status' => $payment->status,
            'status_label' => 'Chờ KH duyệt',
            'created_by' => 'Hệ thống',
            'created_by_email' => '',
            'created_at' => $payment->updated_at?->format('d/m/Y H:i') ?? '',
            'description' => $payment->description ?? ('Hợp đồng: ' . ($payment->contract->name ?? 'N/A')),
            'project_name' => $payment->project->name ?? null,
            'project_id' => $payment->project_id,
            'approval_level' => 'project_payment',
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
            'amount' => (float) ($bill->total_amount ?? 0),
            'status' => $bill->status,
            'status_label' => match ($bill->status) {
                'pending_management' => 'Chờ BĐH duyệt',
                'pending_accountant' => 'Chờ KT xác nhận',
                default => $bill->status,
            },
            'created_by' => $bill->creator->name ?? 'N/A',
            'created_by_email' => $bill->creator->email ?? '',
            'created_at' => $bill->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $bill->note ?? null,
            'project_name' => $bill->project->name ?? null,
            'project_id' => $bill->project_id,
            'approval_level' => match ($bill->status) {
                'pending_management' => 'management',
                'pending_accountant' => 'accountant',
                default => 'done',
            },
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
            'amount' => (float) ($sa->amount ?? 0),
            'status' => $sa->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $sa->creator->name ?? 'N/A',
            'created_by_email' => '',
            'created_at' => $sa->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $sa->notes ?? null,
            'project_name' => $sa->project->name ?? null,
            'project_id' => $sa->project_id,
            'subcontractor_name' => $sa->subcontractor->name ?? null,
            'approval_level' => 'sub_acceptance',
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
            'amount' => (float) ($sa->amount ?? 0),
            'status' => $sa->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $sa->creator->name ?? 'N/A',
            'created_by_email' => '',
            'created_at' => $sa->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $sa->notes ?? null,
            'project_name' => $sa->project->name ?? null,
            'project_id' => $sa->project_id,
            'supplier_name' => $sa->supplier->name ?? null,
            'approval_level' => 'supplier_acceptance',
        ];
    }

    private function formatConstructionLogItem(ConstructionLog $log): array
    {
        return [
            'id' => $log->id,
            'type' => 'construction_log',
            'type_label' => 'Nhật ký CT',
            'title' => 'Nhật ký ' . ($log->log_date?->format('d/m/Y') ?? 'N/A'),
            'subtitle' => ($log->project->code ?? '') . ' - ' . ($log->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $log->approval_status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $log->creator->name ?? 'N/A',
            'created_by_email' => '',
            'created_at' => $log->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $log->notes ?? ($log->task?->name ? 'Công việc: ' . $log->task->name : null),
            'project_name' => $log->project->name ?? null,
            'project_id' => $log->project_id,
            'approval_level' => 'construction_log',
        ];
    }

    private function formatScheduleAdjustmentItem(ScheduleAdjustment $adj): array
    {
        $delayInfo = $adj->delay_days ? "Trễ {$adj->delay_days} ngày" : null;
        return [
            'id' => $adj->id,
            'type' => 'schedule_adjustment',
            'type_label' => 'Điều chỉnh TĐ',
            'title' => ($adj->task?->name ?? 'Điều chỉnh') . ($delayInfo ? " ({$delayInfo})" : ''),
            'subtitle' => ($adj->project->code ?? '') . ' - ' . ($adj->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $adj->status,
            'status_label' => 'Chờ duyệt',
            'created_by' => $adj->creator->name ?? 'N/A',
            'created_by_email' => '',
            'created_at' => $adj->created_at?->format('d/m/Y H:i') ?? '',
            'description' => $adj->reason ?? $adj->impact_analysis,
            'project_name' => $adj->project->name ?? null,
            'project_id' => $adj->project_id,
            'priority' => $adj->priority,
            'approval_level' => 'schedule_adjustment',
        ];
    }

    // =========================================================================
    // SUPPLIER ACCEPTANCE APPROVAL
    // =========================================================================

    public function approveSupplierAcceptance(Request $request, $id)
    {
        $sa = SupplierAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($sa->status !== 'pending') {
            return back()->with('error', 'Nghiệm thu NCC không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $sa->approve(null, $request->notes);
            DB::commit();
            return back()->with('success', 'Đã duyệt nghiệm thu NCC');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu NCC');
        }
    }

    public function rejectSupplierAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $sa = SupplierAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($sa->status !== 'pending') {
            return back()->with('error', 'Nghiệm thu NCC không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $sa->reject($request->reason, null);
            DB::commit();
            return back()->with('success', 'Đã từ chối nghiệm thu NCC');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu NCC');
        }
    }

    // =========================================================================
    // CONSTRUCTION LOG APPROVAL
    // =========================================================================

    public function approveConstructionLog(Request $request, $id)
    {
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($log->approval_status !== 'pending') {
            return back()->with('error', 'Nhật ký không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $log->forceFill([
                'approval_status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ])->save();
            DB::commit();
            return back()->with('success', 'Đã duyệt nhật ký công trường');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nhật ký');
        }
    }

    public function rejectConstructionLog(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $log = ConstructionLog::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($log->approval_status !== 'pending') {
            return back()->with('error', 'Nhật ký không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $log->forceFill([
                'approval_status' => 'rejected',
                'rejected_by' => $user->id,
                'rejected_at' => now(),
                'rejection_reason' => $request->reason,
            ])->save();
            DB::commit();
            return back()->with('success', 'Đã từ chối nhật ký công trường');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nhật ký');
        }
    }

    // =========================================================================
    // SCHEDULE ADJUSTMENT APPROVAL
    // =========================================================================

    public function approveScheduleAdjustment(Request $request, $id)
    {
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($adj->status !== 'pending') {
            return back()->with('error', 'Điều chỉnh tiến độ không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $adj->approve(null, $request->notes);
            DB::commit();
            return back()->with('success', 'Đã duyệt điều chỉnh tiến độ');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt điều chỉnh tiến độ');
        }
    }

    public function rejectScheduleAdjustment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $adj = ScheduleAdjustment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($adj->status !== 'pending') {
            return back()->with('error', 'Điều chỉnh tiến độ không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $adj->reject(null, $request->reason);
            DB::commit();
            return back()->with('success', 'Đã từ chối điều chỉnh tiến độ');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối điều chỉnh tiến độ');
        }
    }

    // =========================================================================
    // CONTRACT APPROVAL (Khách hàng duyệt hợp đồng)
    // =========================================================================

    public function approveContract(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($contract->status !== 'pending_customer_approval') {
            return back()->with('error', 'Hợp đồng không ở trạng thái chờ khách hàng duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $contract->approve($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt hợp đồng');
            }
            DB::commit();
            Log::info('CRM: Contract approved', ['contract_id' => $id, 'by' => $user->id]);
            return back()->with('success', "Đã duyệt hợp đồng \"{$contract->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CRM: Contract approval failed', ['id' => $id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Lỗi hệ thống khi duyệt hợp đồng');
        }
    }

    public function rejectContract(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $contract = Contract::findOrFail($id);

        if ($contract->status !== 'pending_customer_approval') {
            return back()->with('error', 'Hợp đồng không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $contract->reject($request->reason);
            DB::commit();
            return back()->with('success', "Đã từ chối hợp đồng \"{$contract->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối hợp đồng');
        }
    }

    // =========================================================================
    // PROJECT PAYMENT APPROVAL (Khách hàng duyệt thanh toán)
    // =========================================================================

    public function approvePayment(Request $request, $id)
    {
        $payment = ProjectPayment::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($payment->status !== 'customer_pending_approval') {
            return back()->with('error', 'Đợt thanh toán không ở trạng thái chờ khách hàng duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $payment->approveByCustomer($user);
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt thanh toán');
            }
            DB::commit();
            Log::info('CRM: Payment approved by customer', ['payment_id' => $id, 'by' => $user->id]);
            return back()->with('success', 'Đã duyệt đợt thanh toán');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt thanh toán');
        }
    }

    public function rejectPayment(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $payment = ProjectPayment::findOrFail($id);

        if ($payment->status !== 'customer_pending_approval') {
            return back()->with('error', 'Đợt thanh toán không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            // FIX BUG 3: Reset to 'pending' (not 'rejected') to allow re-upload, matching CrmProjectsController
            $payment->update([
                'status' => 'pending',
                'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') . "KH từ chối — " . $request->reason,
            ]);
            DB::commit();
            return back()->with('success', 'Đã từ chối đợt thanh toán');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối thanh toán');
        }
    }

    // =========================================================================
    // MATERIAL BILL APPROVAL
    // =========================================================================

    public function approveMaterialBill(Request $request, $id)
    {
        $billClass = 'App\\Models\\MaterialBill';
        if (!class_exists($billClass)) {
            return back()->with('error', 'Module phiếu vật tư chưa khả dụng');
        }

        $bill = $billClass::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();

            if ($bill->status === 'pending_management' && method_exists($bill, 'approveByManagement')) {
                $bill->approveByManagement($user);
            } elseif ($bill->status === 'pending_accountant' && method_exists($bill, 'approveByAccountant')) {
                $bill->approveByAccountant($user);
            } else {
                DB::rollBack();
                return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt');
            }

            DB::commit();
            Log::info('CRM: Material bill approved', ['bill_id' => $id, 'by' => $user->id]);
            return back()->with('success', 'Đã duyệt phiếu vật tư');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt phiếu vật tư');
        }
    }

    public function rejectMaterialBill(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $billClass = 'App\\Models\\MaterialBill';
        if (!class_exists($billClass)) {
            return back()->with('error', 'Module phiếu vật tư chưa khả dụng');
        }

        $bill = $billClass::findOrFail($id);
        $user = Auth::guard('admin')->user();

        try {
            DB::beginTransaction();
            if (method_exists($bill, 'reject')) {
                $bill->reject($request->reason, $user);
            }
            DB::commit();
            return back()->with('success', 'Đã từ chối phiếu vật tư');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối phiếu vật tư');
        }
    }

    // =========================================================================
    // SUBCONTRACTOR ACCEPTANCE APPROVAL
    // =========================================================================

    public function approveSubAcceptance(Request $request, $id)
    {
        $sa = SubcontractorAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($sa->status !== 'pending') {
            return back()->with('error', 'Nghiệm thu NTP không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $result = $sa->approve($user, $request->input('notes'));
            if (!$result) {
                DB::rollBack();
                return back()->with('error', 'Không thể duyệt nghiệm thu NTP');
            }
            DB::commit();
            Log::info('CRM: Sub acceptance approved', ['id' => $id, 'by' => $user->id]);
            return back()->with('success', 'Đã duyệt nghiệm thu NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi duyệt nghiệm thu NTP');
        }
    }

    public function rejectSubAcceptance(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $sa = SubcontractorAcceptance::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($sa->status !== 'pending') {
            return back()->with('error', 'Nghiệm thu NTP không ở trạng thái chờ duyệt');
        }

        try {
            DB::beginTransaction();
            $sa->reject($request->reason, $user);
            DB::commit();
            return back()->with('success', 'Đã từ chối nghiệm thu NTP');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi hệ thống khi từ chối nghiệm thu NTP');
        }
    }

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Nháp',
            'pending' => 'Chờ duyệt',
            'pending_management_approval', 'pending_management' => 'Chờ BĐH duyệt',
            'pending_accountant_approval', 'pending_accountant' => 'Chờ KT xác nhận',
            'pending_accountant_confirmation' => 'Chờ KT xác nhận',
            'pending_customer_approval', 'customer_pending_approval' => 'Chờ KH duyệt',
            'approved', 'customer_approved' => 'Đã duyệt',
            'paid', 'customer_paid' => 'Đã thanh toán',
            'rejected' => 'Từ chối',
            default => $status,
        };
    }
}
