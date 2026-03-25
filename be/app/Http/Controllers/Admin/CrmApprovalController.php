<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    /**
     * Format a cost record for the frontend.
     */
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
