<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApprovalCenterController extends Controller
{
    /**
     * Get all pending approvals for the current user based on their permissions.
     * This is the main "Approval Center" screen data source.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $type = $request->get('type', 'all'); // all, company_cost, project_cost, material_bill

        $result = [
            'summary' => [],
            'items' => [],
        ];

        // Determine user's approval capabilities
        $canApproveManagement = $user->hasPermission('cost.approve.management') || $user->hasPermission('cost.approve_management');
        $canApproveAccountant = $user->hasPermission('cost.approve.accountant') || $user->hasPermission('cost.approve_accountant');

        // ================================
        // 1. COMPANY COSTS (Chi phí công ty)
        // ================================
        if ($type === 'all' || $type === 'company_cost') {
            $companyCosts = collect();

            if ($canApproveManagement) {
                $mgmtPending = Cost::companyCosts()
                    ->where('status', 'pending_management_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $companyCosts = $companyCosts->merge($mgmtPending);
            }

            if ($canApproveAccountant) {
                $acctPending = Cost::companyCosts()
                    ->where('status', 'pending_accountant_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name', 'managementApprover:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $companyCosts = $companyCosts->merge($acctPending);
            }

            if ($companyCosts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'company_cost',
                    'label' => 'Chi phí công ty',
                    'icon' => 'wallet-outline',
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
                        'created_at' => $cost->created_at->toISOString(),
                        'cost_date' => $cost->cost_date,
                        'description' => $cost->description,
                        'management_approved_by' => $cost->managementApprover->name ?? null,
                        'management_approved_at' => $cost->management_approved_at,
                        'route' => "/company-costs/{$cost->id}",
                        'can_approve' => ($cost->status === 'pending_management_approval' && $canApproveManagement) ||
                                        ($cost->status === 'pending_accountant_approval' && $canApproveAccountant),
                        'approval_level' => $cost->status === 'pending_management_approval' ? 'management' : 'accountant',
                    ];
                }
            }
        }

        // ================================
        // 2. PROJECT COSTS (Chi phí dự án)
        // ================================
        if ($type === 'all' || $type === 'project_cost') {
            $projectCosts = collect();

            if ($canApproveManagement) {
                $mgmtPending = Cost::whereNotNull('project_id')
                    ->where('status', 'pending_management_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $projectCosts = $projectCosts->merge($mgmtPending);
            }

            if ($canApproveAccountant) {
                $acctPending = Cost::whereNotNull('project_id')
                    ->where('status', 'pending_accountant_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $projectCosts = $projectCosts->merge($acctPending);
            }

            if ($projectCosts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'project_cost',
                    'label' => 'Chi phí dự án',
                    'icon' => 'construct-outline',
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
                        'created_at' => $cost->created_at->toISOString(),
                        'cost_date' => $cost->cost_date,
                        'description' => $cost->description,
                        'project_id' => $cost->project_id,
                        'project_name' => $cost->project->name ?? null,
                        'management_approved_by' => $cost->managementApprover->name ?? null,
                        'route' => "/projects/{$cost->project_id}",
                        'can_approve' => ($cost->status === 'pending_management_approval' && $canApproveManagement) ||
                                        ($cost->status === 'pending_accountant_approval' && $canApproveAccountant),
                        'approval_level' => $cost->status === 'pending_management_approval' ? 'management' : 'accountant',
                    ];
                }
            }
        }

        // ================================
        // 3. MATERIAL BILLS (Phiếu xuất vật tư)
        // ================================
        if ($type === 'all' || $type === 'material_bill') {
            $materialBillClass = 'App\\Models\\MaterialBill';
            if (class_exists($materialBillClass)) {
                $materialBills = collect();

                if ($canApproveManagement) {
                    $mgmtPending = $materialBillClass::where('status', 'pending_management_approval')
                        ->with(['creator:id,name,email', 'project:id,name,code'])
                        ->orderBy('created_at', 'desc')
                        ->get();
                    $materialBills = $materialBills->merge($mgmtPending);
                }

                if ($canApproveAccountant) {
                    $acctPending = $materialBillClass::where('status', 'pending_accountant_approval')
                        ->with(['creator:id,name,email', 'project:id,name,code'])
                        ->orderBy('created_at', 'desc')
                        ->get();
                    $materialBills = $materialBills->merge($acctPending);
                }

                if ($materialBills->isNotEmpty()) {
                    $result['summary'][] = [
                        'type' => 'material_bill',
                        'label' => 'Phiếu xuất vật tư',
                        'icon' => 'cube-outline',
                        'color' => '#8B5CF6',
                        'total' => $materialBills->count(),
                        'pending_management' => $materialBills->where('status', 'pending_management_approval')->count(),
                        'pending_accountant' => $materialBills->where('status', 'pending_accountant_approval')->count(),
                    ];

                    foreach ($materialBills as $bill) {
                        $result['items'][] = [
                            'id' => $bill->id,
                            'type' => 'material_bill',
                            'title' => $bill->bill_number ?? "Phiếu #{$bill->id}",
                            'subtitle' => ($bill->project->code ?? '') . ' - ' . ($bill->project->name ?? 'Dự án'),
                            'amount' => (float) ($bill->total_amount ?? 0),
                            'status' => $bill->status,
                            'status_label' => $this->getStatusLabel($bill->status),
                            'created_by' => $bill->creator->name ?? 'N/A',
                            'created_at' => $bill->created_at->toISOString(),
                            'description' => $bill->note ?? null,
                            'project_id' => $bill->project_id,
                            'route' => "/projects/{$bill->project_id}",
                            'can_approve' => true,
                            'approval_level' => $bill->status === 'pending_management_approval' ? 'management' : 'accountant',
                        ];
                    }
                }
            }
        }

        // Sort all items by created_at desc
        usort($result['items'], function ($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        // Calculate grand total
        $result['grand_total'] = array_sum(array_column($result['summary'], 'total'));

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Quick approve action directly from approval center.
     */
    public function quickApprove(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill',
            'id' => 'required|integer',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        try {
            switch ($type) {
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($id);

                    if ($cost->status === 'pending_management_approval') {
                        if (!$cost->approveByManagement($user)) {
                            return response()->json(['success' => false, 'message' => 'Không thể duyệt'], 400);
                        }
                        return response()->json([
                            'success' => true,
                            'message' => 'Đã duyệt chi phí (Ban điều hành)',
                        ]);
                    }

                    if ($cost->status === 'pending_accountant_approval') {
                        if (!$cost->approveByAccountant($user)) {
                            return response()->json(['success' => false, 'message' => 'Không thể xác nhận'], 400);
                        }
                        return response()->json([
                            'success' => true,
                            'message' => 'Đã xác nhận chi phí (Kế toán)',
                        ]);
                    }

                    return response()->json(['success' => false, 'message' => 'Chi phí không ở trạng thái chờ duyệt'], 400);

                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (!class_exists($billClass)) {
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }

                    $bill = $billClass::findOrFail($id);

                    if ($bill->status === 'pending_management_approval' && method_exists($bill, 'approveByManagement')) {
                        $bill->approveByManagement($user);
                        return response()->json(['success' => true, 'message' => 'Đã duyệt phiếu vật tư (Ban điều hành)']);
                    }

                    if ($bill->status === 'pending_accountant_approval' && method_exists($bill, 'approveByAccountant')) {
                        $bill->approveByAccountant($user);
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận phiếu vật tư (Kế toán)']);
                    }

                    return response()->json(['success' => false, 'message' => 'Phiếu không ở trạng thái chờ duyệt'], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Quick reject action directly from approval center.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill',
            'id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();

        try {
            switch ($request->type) {
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($request->id);
                    if (!$cost->reject($request->reason, $user)) {
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối'], 400);
                    }
                    return response()->json(['success' => true, 'message' => 'Đã từ chối chi phí']);

                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (class_exists($billClass)) {
                        $bill = $billClass::findOrFail($request->id);
                        if (method_exists($bill, 'reject')) {
                            $bill->reject($request->reason, $user);
                            return response()->json(['success' => true, 'message' => 'Đã từ chối phiếu vật tư']);
                        }
                    }
                    return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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
