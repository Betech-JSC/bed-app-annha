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
     * Display the Approval Center page.
     */
    public function index(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $type = $request->get('type', 'all');

        // Load approval data
        $data = $this->getApprovalData($admin, $type);

        return Inertia::render('Crm/Approvals/Index', [
            'approvalData' => $data,
            'currentType' => $type,
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

        // Don't set management_approved_by — FK constraint references users table, Admin ID would violate it
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

        // Use model method without user to handle all side effects properly
        $cost->approveByAccountant(); // handles FK-safe status change + subcontractor + material + budget

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
     * Aggregate all pending approvals.
     */
    private function getApprovalData($admin, $type)
    {
        $result = [
            'summary' => [],
            'items' => [],
            'grand_total' => 0,
        ];

        // ========================================
        // 1. COMPANY COSTS
        // ========================================
        if ($type === 'all' || $type === 'company_cost') {
            $companyCosts = Cost::companyCosts()
                ->whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])
                ->with(['creator:id,name,email', 'costGroup:id,name', 'managementApprover:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($companyCosts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'company_cost',
                    'label' => 'Chi phí công ty',
                    'icon' => 'wallet',
                    'color' => '#F59E0B',
                    'total' => $companyCosts->count(),
                    'pending_management' => $companyCosts->where('status', 'pending_management_approval')->count(),
                    'pending_accountant' => $companyCosts->where('status', 'pending_accountant_approval')->count(),
                ];

                foreach ($companyCosts as $cost) {
                    $result['items'][] = [
                        'id' => $cost->id,
                        'type' => 'company_cost',
                        'title' => $cost->name,
                        'subtitle' => $cost->costGroup->name ?? 'Không phân nhóm',
                        'amount' => (float) $cost->amount,
                        'status' => $cost->status,
                        'status_label' => $this->getStatusLabel($cost->status),
                        'created_by' => $cost->creator->name ?? 'N/A',
                        'created_at' => $cost->created_at->format('d/m/Y H:i'),
                        'cost_date' => $cost->cost_date,
                        'description' => $cost->description,
                        'management_approved_by' => $cost->managementApprover->name ?? null,
                        'management_approved_at' => $cost->management_approved_at?->format('d/m/Y H:i'),
                        'approval_level' => $cost->status === 'pending_management_approval' ? 'management' : 'accountant',
                    ];
                }
            }
        }

        // ========================================
        // 2. PROJECT COSTS
        // ========================================
        if ($type === 'all' || $type === 'project_cost') {
            $projectCosts = Cost::whereNotNull('project_id')
                ->whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])
                ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($projectCosts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'project_cost',
                    'label' => 'Chi phí dự án',
                    'icon' => 'project',
                    'color' => '#3B82F6',
                    'total' => $projectCosts->count(),
                    'pending_management' => $projectCosts->where('status', 'pending_management_approval')->count(),
                    'pending_accountant' => $projectCosts->where('status', 'pending_accountant_approval')->count(),
                ];

                foreach ($projectCosts as $cost) {
                    $result['items'][] = [
                        'id' => $cost->id,
                        'type' => 'project_cost',
                        'title' => $cost->name,
                        'subtitle' => ($cost->project->code ?? '') . ' - ' . ($cost->project->name ?? 'Dự án'),
                        'amount' => (float) $cost->amount,
                        'status' => $cost->status,
                        'status_label' => $this->getStatusLabel($cost->status),
                        'created_by' => $cost->creator->name ?? 'N/A',
                        'created_at' => $cost->created_at->format('d/m/Y H:i'),
                        'cost_date' => $cost->cost_date,
                        'description' => $cost->description,
                        'project_name' => $cost->project->name ?? null,
                        'project_id' => $cost->project_id,
                        'management_approved_by' => $cost->managementApprover->name ?? null,
                        'approval_level' => $cost->status === 'pending_management_approval' ? 'management' : 'accountant',
                    ];
                }
            }
        }

        // Sort by created_at (newest first)
        usort($result['items'], function ($a, $b) {
            return strtotime(str_replace('/', '-', $b['created_at'])) - strtotime(str_replace('/', '-', $a['created_at']));
        });

        $result['grand_total'] = array_sum(array_column($result['summary'], 'total'));

        return $result;
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
