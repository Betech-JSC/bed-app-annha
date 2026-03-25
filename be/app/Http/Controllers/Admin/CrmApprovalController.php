<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
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

        // ─── Customer Acceptance (Khách hàng duyệt nghiệm thu) ───
        $customerAcceptanceItems = AcceptanceStage::where('status', 'project_manager_approved')
            ->with(['project:id,name,code', 'projectManagerApprover:id,name', 'task:id,name'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($stage) => $this->formatAcceptanceItem($stage));

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

        // ─── Recently processed (last 30 items) ───
        $recentItems = Cost::whereIn('status', ['approved', 'rejected'])
            ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
            ->orderBy('updated_at', 'desc')
            ->limit(30)
            ->get()
            ->map(fn($cost) => $this->formatItem($cost));

        // ─── Stats ───
        $stats = [
            'pending_management' => $managementItems->count(),
            'pending_accountant' => $accountantItems->count(),
            'pending_customer' => $customerAcceptanceItems->count(),
            'pending_change_request' => $changeRequestItems->count(),
            'pending_additional_cost' => $additionalCostItems->count(),
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
            'customerAcceptanceItems' => $customerAcceptanceItems->values(),
            'changeRequestItems' => $changeRequestItems->values(),
            'additionalCostItems' => $additionalCostItems->values(),
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

        if (!in_array($stage->status, ['project_manager_approved', 'customer_approved'])) {
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

            // AdditionalCost::approve() handles both pending_approval and customer_paid flows
            // For 'pending' status, we need to move to pending_approval first then approve
            if ($ac->status === 'pending') {
                $ac->status = 'pending_approval';
                $ac->save();
            }

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

            $ac->reject($request->reason);

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

    private function formatAcceptanceItem(AcceptanceStage $stage): array
    {
        return [
            'id' => $stage->id,
            'type' => 'acceptance',
            'type_label' => 'Nghiệm thu',
            'title' => $stage->name,
            'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
            'amount' => 0,
            'status' => $stage->status,
            'status_label' => 'Chờ KH duyệt',
            'created_by' => $stage->projectManagerApprover->name ?? 'N/A',
            'created_by_email' => '',
            'created_at' => $stage->updated_at?->format('d/m/Y H:i') ?? '',
            'description' => $stage->description,
            'project_name' => $stage->project->name ?? null,
            'project_id' => $stage->project_id,
            'task_name' => $stage->task->name ?? null,
            'approval_level' => 'customer',
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

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Nháp',
            'pending_management_approval' => 'Chờ BĐH duyệt',
            'pending_accountant_approval' => 'Chờ KT xác nhận',
            'approved' => 'Đã duyệt',
            'rejected' => 'Từ chối',
            default => $status,
        };
    }
}
