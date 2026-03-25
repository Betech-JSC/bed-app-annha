<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    /**
     * Approve a cost by management.
     */
    public function approveManagement(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);

        if ($cost->status !== 'pending_management_approval') {
            return back()->with('error', 'Chi phí không ở trạng thái chờ BĐH duyệt');
        }

        $cost->management_approved_at = now();
        $cost->status = 'pending_accountant_approval';
        $cost->save();

        return back()->with('success', "Đã duyệt chi phí \"{$cost->name}\" (Ban điều hành)");
    }

    /**
     * Approve a cost by accountant.
     */
    public function approveAccountant(Request $request, $id)
    {
        $cost = Cost::findOrFail($id);

        if ($cost->status !== 'pending_accountant_approval') {
            return back()->with('error', 'Chi phí không ở trạng thái chờ KT xác nhận');
        }

        $cost->approveByAccountant();

        return back()->with('success', "Đã xác nhận chi phí \"{$cost->name}\" (Kế toán)");
    }

    /**
     * Reject a cost.
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $cost = Cost::findOrFail($id);

        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return back()->with('error', 'Chi phí không ở trạng thái chờ duyệt');
        }

        $cost->status = 'rejected';
        $cost->rejected_reason = $request->reason;
        $cost->save();

        return back()->with('success', "Đã từ chối chi phí \"{$cost->name}\"");
    }

    // =========================================================================
    // Customer Acceptance Approval
    // =========================================================================

    public function approveCustomerAcceptance(Request $request, $id)
    {
        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if ($stage->status !== 'project_manager_approved') {
            return back()->with('error', 'Giai đoạn nghiệm thu không ở trạng thái chờ khách hàng duyệt');
        }

        $stage->approveCustomer($user);

        return back()->with('success', "Khách hàng đã duyệt nghiệm thu \"{$stage->name}\"");
    }

    public function rejectCustomerAcceptance(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $stage = AcceptanceStage::findOrFail($id);
        $user = Auth::guard('admin')->user();

        $stage->reject($request->reason, $user);

        return back()->with('success', "Đã từ chối nghiệm thu \"{$stage->name}\"");
    }

    // =========================================================================
    // Change Request Approval
    // =========================================================================

    public function approveChangeRequest(Request $request, $id)
    {
        $cr = ChangeRequest::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($cr->status, ['submitted', 'under_review'])) {
            return back()->with('error', 'Yêu cầu thay đổi không ở trạng thái chờ duyệt');
        }

        $cr->approve($user, $request->input('notes'));

        return back()->with('success', "Đã duyệt yêu cầu thay đổi \"{$cr->title}\"");
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

        $cr->reject($user, $request->reason);

        return back()->with('success', "Đã từ chối yêu cầu thay đổi \"{$cr->title}\"");
    }

    // =========================================================================
    // Additional Cost Approval
    // =========================================================================

    public function approveAdditionalCost(Request $request, $id)
    {
        $ac = AdditionalCost::findOrFail($id);
        $user = Auth::guard('admin')->user();

        if (!in_array($ac->status, ['pending', 'pending_approval'])) {
            return back()->with('error', 'Chi phí phát sinh không ở trạng thái chờ duyệt');
        }

        $ac->approve($user);

        return back()->with('success', "Đã duyệt chi phí phát sinh");
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

        $ac->reject($request->reason);

        return back()->with('success', "Đã từ chối chi phí phát sinh");
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
