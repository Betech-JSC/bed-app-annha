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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CrmApprovalController extends Controller
{
    use CrmAuthorization;
    /**
     * Display the Approval Center page — grouped by approval level.
     */
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $allProjectIds = $user->isSuperAdmin() ? [] : $user->projects()->pluck('projects.id')->toArray();

        // ─── Management Level (BĐH) — Show All (Draft, Pending, Management, Rejected) ───
        $managementItems = Cost::whereIn('status', ['draft', 'pending', 'pending_management_approval', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $managementItemsFormatted = $managementItems->map(fn(Cost $cost) => $this->formatItem($cost));

        // ─── Accountant Level (KT) — Show All (Accountant, Approved, Rejected) ───
        $accountantItems = Cost::whereIn('status', ['pending_accountant_approval', 'approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $accountantItemsFormatted = $accountantItems->map(fn(Cost $cost) => $this->formatItem($cost));

        // ─── Nghiệm thu chờ GS duyệt ───
        $acceptanceSupervisorItems = AcceptanceStage::where('status', 'pending')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $acceptanceSupervisorItemsFormatted = $acceptanceSupervisorItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ GS duyệt', 'supervisor'));

        // ─── Nghiệm thu chờ QLDA duyệt ───
        $acceptancePMItems = AcceptanceStage::where('status', 'supervisor_approved')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'supervisorApprover:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $acceptancePMItemsFormatted = $acceptancePMItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ QLDA duyệt', 'project_manager'));

        // ─── Customer Acceptance (Khách hàng duyệt nghiệm thu) ───
        $customerAcceptanceItems = AcceptanceStage::where('status', 'project_manager_approved')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'projectManagerApprover:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $customerAcceptanceItemsFormatted = $customerAcceptanceItems->map(fn(AcceptanceStage $stage) => $this->formatAcceptanceItem($stage, 'Chờ KH duyệt', 'customer'));

        // ─── Change Requests ───
        $changeRequestItems = ChangeRequest::whereIn('status', ['submitted', 'under_review', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $changeRequestItemsFormatted = $changeRequestItems->map(fn(ChangeRequest $cr) => $this->formatChangeRequestItem($cr));

        // ─── Additional Costs ───
        $additionalCostItems = AdditionalCost::whereIn('status', ['pending', 'pending_approval', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $additionalCostItemsFormatted = $additionalCostItems->map(fn(AdditionalCost $ac) => $this->formatAdditionalCostItem($ac));

        // ─── Subcontractor Payments chờ duyệt ───
        $subPaymentManagement = SubcontractorPayment::whereIn('status', ['pending_management_approval', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subPaymentManagementFormatted = $subPaymentManagement->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));

        $subPaymentAccountant = SubcontractorPayment::where('status', 'pending_accountant_confirmation')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subPaymentAccountantFormatted = $subPaymentAccountant->map(fn(SubcontractorPayment $p) => $this->formatSubPaymentItem($p));

        // ─── Hợp đồng chờ Khách hàng duyệt ───
        $contractItems = Contract::where('status', 'pending_customer_approval')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $contractItemsFormatted = $contractItems->map(fn(Contract $c) => $this->formatContractItem($c));

        // ─── Thanh toán dự án chờ Khách hàng duyệt ───
        $pendingPaymentItems = ProjectPayment::where('status', 'customer_pending_approval')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'contract:id,contract_value', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->get();
        $pendingPaymentItemsFormatted = $pendingPaymentItems->map(fn(ProjectPayment $p) => $this->formatPaymentItem($p));

        // ─── Thanh toán dự án khách đã trả (Chờ KT xác nhận) ───
        $paidPaymentItems = ProjectPayment::where('status', 'customer_paid')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
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
                ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));

            $materialBillAccountantItemsFormatted = $materialBillClass::where('status', 'pending_accountant')
                ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                ->with(['creator:id,name,email', 'project:id,name,code', 'attachments'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($b) => $this->formatMaterialBillItem($b));
        }

        // ─── Nghiệm thu NTP chờ duyệt ───
        $subAcceptanceItems = SubcontractorAcceptance::where('status', 'pending')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $subAcceptanceItemsFormatted = $subAcceptanceItems->map(fn(SubcontractorAcceptance $sa) => $this->formatSubAcceptanceItem($sa));

        // ─── Nghiệm thu NCC chờ duyệt ───
        $supplierAcceptanceItems = SupplierAcceptance::where('status', 'pending')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['supplier:id,name', 'project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $supplierAcceptanceItemsFormatted = $supplierAcceptanceItems->map(fn(SupplierAcceptance $sa) => $this->formatSupplierAcceptanceItem($sa));

        // ─── Nhật ký công trường ───
        $constructionLogItems = ConstructionLog::whereIn('approval_status', ['pending', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
            ->orderBy('log_date', 'desc')
            ->get();
        $constructionLogItemsFormatted = $constructionLogItems->map(fn(ConstructionLog $log) => $this->formatConstructionLogItem($log));

        // ─── Điều chỉnh tiến độ chờ duyệt ───
        $scheduleAdjustmentItems = ScheduleAdjustment::where('status', 'pending')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name', 'task:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $scheduleAdjustmentItemsFormatted = $scheduleAdjustmentItems->map(fn(ScheduleAdjustment $adj) => $this->formatScheduleAdjustmentItem($adj));

        // ─── Lỗi nghiệm thu chờ xác nhận (fixed → chờ GS/QLDA verify) ───
        $defectItems = Defect::where('status', 'fixed')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'reporter:id,name', 'fixer:id,name', 'task:id,name', 'acceptanceStage:id,name', 'attachments'])
            ->orderBy('fixed_at', 'desc')
            ->get();
        $defectItemsFormatted = $defectItems->map(fn(Defect $d) => $this->formatDefectItem($d));

        // ─── Project Budgets (Ngân sách chưa duyệt) ───
        $budgetItems = ProjectBudget::whereIn('status', ['draft', 'pending_approval'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $budgetItemsFormatted = $budgetItems->map(fn(ProjectBudget $b) => $this->formatBudget($b));

        // ─── Thuê thiết bị (Equipment rentals) ───
        $equipmentRentalManagement = EquipmentRental::whereIn('status', ['pending_management', 'rejected'])
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $equipmentRentalManagementFormatted = $equipmentRentalManagement->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));

        $equipmentRentalAccountant = EquipmentRental::where('status', 'pending_accountant')
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'approver:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $equipmentRentalAccountantFormatted = $equipmentRentalAccountant->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));

        $equipmentRentalReturn = EquipmentRental::where('status', 'pending_return')
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $equipmentRentalReturnFormatted = $equipmentRentalReturn->map(fn(EquipmentRental $r) => $this->formatEquipmentRentalItem($r));

        // ─── Sử dụng thiết bị (Asset usages) ───
        $assetUsageManagement = AssetUsage::whereIn('status', ['pending_management', 'rejected'])
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $assetUsageManagementFormatted = $assetUsageManagement->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));

        $assetUsageAccountant = AssetUsage::where('status', 'pending_accountant')
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'approver:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $assetUsageAccountantFormatted = $assetUsageAccountant->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));

        $assetUsageReturn = AssetUsage::where('status', 'pending_return')
            ->whereHas('project', function ($q) use ($user, $allProjectIds) {
                if (!$user->isSuperAdmin()) {
                    $q->whereIn('id', $allProjectIds);
                }
            })
            ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get();
        $assetUsageReturnFormatted = $assetUsageReturn->map(fn(AssetUsage $u) => $this->formatAssetUsageItem($u));

        // ─── Recently processed feed ───
        $recentCosts = Cost::whereIn('status', ['approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get();

        $recentCR = ChangeRequest::whereIn('status', ['approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'requester:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAC = AdditionalCost::whereIn('status', ['approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'proposer:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentSubPayments = SubcontractorPayment::whereIn('status', ['paid', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentAcceptances = AcceptanceStage::whereIn('status', ['customer_approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentBudgets = ProjectBudget::whereIn('status', ['approved', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $recentRentals = EquipmentRental::whereIn('status', ['in_use', 'returned', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name,email', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        $recentUsages = AssetUsage::whereIn('status', ['in_use', 'returned', 'rejected'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        $recentItems = collect([])
            ->concat($recentCosts->map(fn(Cost $item) => $this->formatItem($item)))
            ->concat($recentCR->map(fn(ChangeRequest $item) => $this->formatChangeRequestItem($item)))
            ->concat($recentAC->map(fn(AdditionalCost $item) => $this->formatAdditionalCostItem($item)))
            ->concat($recentSubPayments->map(fn(SubcontractorPayment $item) => $this->formatSubPaymentItem($item)))
            ->concat($recentAcceptances->map(fn(AcceptanceStage $item) => $this->formatAcceptanceItem($item, 'Nghiệm thu', 'customer')))
            ->concat($recentBudgets->map(fn(ProjectBudget $item) => $this->formatBudget($item)))
            ->concat($recentRentals->map(fn(EquipmentRental $item) => $this->formatEquipmentRentalItem($item)))
            ->concat($recentUsages->map(fn(AssetUsage $item) => $this->formatAssetUsageItem($item)))
            ->sortByDesc('created_at')
            ->take(30)
            ->values();

        // ─── Actually Pending Stats (Exclude Draft/Rejected for KPIs) ───
        $realPendingManagement = Cost::whereIn('status', ['pending', 'pending_management_approval'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->count();
        $realPendingAccountant = Cost::whereIn('status', ['pending_accountant_approval'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->count();
        $realPendingAcceptance = AcceptanceStage::whereIn('status', ['pending', 'supervisor_approved', 'project_manager_approved'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
            ->count();
        
        // Security Check: If user is a customer, only count items they are supposed to see
        $isCustomer = Auth::user()->role === 'customer';
        
        $stats = [
            'pending_management' => $isCustomer ? 0 : $realPendingManagement,
            'pending_accountant' => $isCustomer ? 0 : $realPendingAccountant,
            'pending_acceptance' => $realPendingAcceptance,
            'pending_others' => $isCustomer ? 0 : (
                $changeRequestItems->count() + 
                $additionalCostItems->count() + 
                $subPaymentManagement->count() + 
                $materialBillManagementItemsFormatted->count() +
                $equipmentRentalManagement->count() +
                $assetUsageManagement->count()
            ),
            'approved_today' => Cost::where('status', 'approved')->whereDate('updated_at', today())
                ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                ->count(),
            'rejected_today' => Cost::where('status', 'rejected')->whereDate('updated_at', today())
                ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                ->count(),
            'total_pending_amount' => $isCustomer 
                ? ProjectPayment::where('status', 'customer_pending_approval')
                    ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                    ->sum('amount')
                : Cost::whereIn('status', ['pending', 'pending_management_approval', 'pending_accountant_approval'])
                    ->when(!$user->isSuperAdmin(), fn($q) => $q->whereIn('project_id', $allProjectIds))
                    ->sum('amount'),
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
            'equipmentRentalManagementItems' => $equipmentRentalManagementFormatted->values(),
            'equipmentRentalAccountantItems' => $equipmentRentalAccountantFormatted->values(),
            'equipmentRentalReturnItems' => $equipmentRentalReturnFormatted->values(),
            'assetUsageManagementItems' => $assetUsageManagementFormatted->values(),
            'assetUsageAccountantItems' => $assetUsageAccountantFormatted->values(),
            'assetUsageReturnItems' => $assetUsageReturnFormatted->values(),
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
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $cost->project);

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
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $cost->project);

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
        $this->crmRequire($user, Permissions::COST_REJECT, $cost->project);

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
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $stage->project);

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
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $stage->project);

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
        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $cr->project);

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
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $cr->project);

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
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_APPROVE, $ac->project);

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
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_APPROVE, $ac->project);

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
