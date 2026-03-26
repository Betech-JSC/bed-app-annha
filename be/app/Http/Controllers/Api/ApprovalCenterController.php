<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use App\Models\SubcontractorPayment;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ApprovalCenterController extends Controller
{
    /**
     * Get all pending approvals for the current user based on their permissions.
     * This is the main "Approval Center" screen data source.
     *
     * Supports filtering by type:
     *   all, company_cost, project_cost, material_bill,
     *   acceptance, change_request, additional_cost,
     *   sub_payment, contract, payment, sub_acceptance, supplier_acceptance
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $type = $request->get('type', 'all');

        $result = [
            'summary' => [],
            'items' => [],
        ];

        // Determine user's approval capabilities
        $canApproveManagement = $user->hasPermission('cost.approve.management') || $user->hasPermission('cost.approve_management');
        $canApproveAccountant = $user->hasPermission('cost.approve.accountant') || $user->hasPermission('cost.approve_accountant');

        // ================================================================
        // 1. COMPANY COSTS (Chi phí công ty)
        // ================================================================
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

        // ================================================================
        // 2. PROJECT COSTS (Chi phí dự án)
        // ================================================================
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

        // ================================================================
        // 3. MATERIAL BILLS (Phiếu xuất vật tư)
        // ================================================================
        if ($type === 'all' || $type === 'material_bill') {
            $materialBillClass = 'App\\Models\\MaterialBill';
            if (class_exists($materialBillClass)) {
                $materialBills = $materialBillClass::whereIn('status', ['pending_management', 'pending_accountant'])
                    ->with(['creator:id,name,email', 'project:id,name,code'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                if ($materialBills->isNotEmpty()) {
                    $result['summary'][] = [
                        'type' => 'material_bill',
                        'label' => 'Phiếu xuất vật tư',
                        'icon' => 'cube-outline',
                        'color' => '#8B5CF6',
                        'total' => $materialBills->count(),
                        'pending_management' => $materialBills->where('status', 'pending_management')->count(),
                        'pending_accountant' => $materialBills->where('status', 'pending_accountant')->count(),
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
                            'can_approve' => ($bill->status === 'pending_management' && $canApproveManagement) ||
                                            ($bill->status === 'pending_accountant' && $canApproveAccountant),
                            'approval_level' => $bill->status === 'pending_management' ? 'management' : 'accountant',
                        ];
                    }
                }
            }
        }

        // ================================================================
        // 4. ACCEPTANCE STAGES (Nghiệm thu - chờ KH duyệt)
        // ================================================================
        if ($type === 'all' || $type === 'acceptance') {
            $acceptanceStages = AcceptanceStage::where('status', 'project_manager_approved')
                ->with(['project:id,name,code', 'projectManagerApprover:id,name'])
                ->orderBy('project_manager_approved_at', 'desc')
                ->get();

            if ($acceptanceStages->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'acceptance',
                    'label' => 'Nghiệm thu KH',
                    'icon' => 'checkmark-done-outline',
                    'color' => '#10B981',
                    'total' => $acceptanceStages->count(),
                ];

                foreach ($acceptanceStages as $stage) {
                    $result['items'][] = [
                        'id' => $stage->id,
                        'type' => 'acceptance',
                        'title' => $stage->name,
                        'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $stage->status,
                        'status_label' => 'Chờ KH duyệt',
                        'created_by' => $stage->projectManagerApprover->name ?? 'QLDA',
                        'created_at' => $stage->project_manager_approved_at?->toISOString() ?? $stage->updated_at->toISOString(),
                        'description' => $stage->description ?? null,
                        'project_id' => $stage->project_id,
                        'route' => "/projects/{$stage->project_id}/acceptance",
                        'can_approve' => true,
                        'approval_level' => 'customer',
                    ];
                }
            }
        }

        // ================================================================
        // 5. CHANGE REQUESTS (Yêu cầu thay đổi)
        // ================================================================
        if ($type === 'all' || $type === 'change_request') {
            $changeRequests = ChangeRequest::whereIn('status', ['submitted', 'under_review'])
                ->with(['project:id,name,code', 'requester:id,name,email'])
                ->orderBy('submitted_at', 'desc')
                ->get();

            if ($changeRequests->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'change_request',
                    'label' => 'Yêu cầu thay đổi',
                    'icon' => 'git-compare-outline',
                    'color' => '#EC4899',
                    'total' => $changeRequests->count(),
                ];

                foreach ($changeRequests as $cr) {
                    $result['items'][] = [
                        'id' => $cr->id,
                        'type' => 'change_request',
                        'title' => $cr->title ?? $cr->name ?? "CR #{$cr->id}",
                        'subtitle' => ($cr->project->code ?? '') . ' - ' . ($cr->project->name ?? 'Dự án'),
                        'amount' => (float) ($cr->cost_impact ?? 0),
                        'status' => $cr->status,
                        'status_label' => $cr->status === 'submitted' ? 'Đã gửi' : 'Đang xem xét',
                        'created_by' => $cr->requester->name ?? 'N/A',
                        'created_at' => $cr->submitted_at?->toISOString() ?? $cr->created_at->toISOString(),
                        'description' => $cr->description,
                        'project_id' => $cr->project_id,
                        'priority' => $cr->priority ?? null,
                        'route' => "/projects/{$cr->project_id}/change-requests",
                        'can_approve' => true,
                        'approval_level' => 'change_request',
                    ];
                }
            }
        }

        // ================================================================
        // 6. ADDITIONAL COSTS (Chi phí phát sinh)
        // ================================================================
        if ($type === 'all' || $type === 'additional_cost') {
            $additionalCosts = AdditionalCost::whereIn('status', ['pending', 'pending_approval'])
                ->with(['project:id,name,code', 'proposer:id,name,email'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($additionalCosts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'additional_cost',
                    'label' => 'CP Phát sinh',
                    'icon' => 'trending-up-outline',
                    'color' => '#F97316',
                    'total' => $additionalCosts->count(),
                ];

                foreach ($additionalCosts as $ac) {
                    $result['items'][] = [
                        'id' => $ac->id,
                        'type' => 'additional_cost',
                        'title' => $ac->name ?? "CPPS #{$ac->id}",
                        'subtitle' => ($ac->project->code ?? '') . ' - ' . ($ac->project->name ?? 'Dự án'),
                        'amount' => (float) ($ac->amount ?? 0),
                        'status' => $ac->status,
                        'status_label' => 'Chờ duyệt',
                        'created_by' => $ac->proposer->name ?? 'N/A',
                        'created_at' => $ac->created_at->toISOString(),
                        'description' => $ac->description,
                        'project_id' => $ac->project_id,
                        'route' => "/projects/{$ac->project_id}/additional-costs",
                        'can_approve' => true,
                        'approval_level' => 'additional_cost',
                    ];
                }
            }
        }

        // ================================================================
        // 7. SUBCONTRACTOR PAYMENTS (Thanh toán NTP)
        // ================================================================
        if ($type === 'all' || $type === 'sub_payment') {
            $subPayments = SubcontractorPayment::whereIn('status', ['pending_management_approval', 'pending_accountant_confirmation'])
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($subPayments->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'sub_payment',
                    'label' => 'Thanh toán NTP',
                    'icon' => 'card-outline',
                    'color' => '#0EA5E9',
                    'total' => $subPayments->count(),
                    'pending_management' => $subPayments->where('status', 'pending_management_approval')->count(),
                    'pending_accountant' => $subPayments->where('status', 'pending_accountant_confirmation')->count(),
                ];

                foreach ($subPayments as $payment) {
                    $result['items'][] = [
                        'id' => $payment->id,
                        'type' => 'sub_payment',
                        'title' => 'TT: ' . ($payment->subcontractor->name ?? 'NTP'),
                        'subtitle' => ($payment->project->code ?? '') . ' - ' . ($payment->project->name ?? 'Dự án'),
                        'amount' => (float) $payment->amount,
                        'status' => $payment->status,
                        'status_label' => $this->getStatusLabel($payment->status),
                        'created_by' => $payment->creator->name ?? 'N/A',
                        'created_at' => $payment->created_at->toISOString(),
                        'description' => $payment->description ?? ('Đợt: ' . ($payment->payment_stage ?? 'N/A')),
                        'project_id' => $payment->project_id,
                        'subcontractor_name' => $payment->subcontractor->name ?? null,
                        'management_approved_by' => $payment->approver->name ?? null,
                        'route' => "/projects/{$payment->project_id}/subcontractor-payments",
                        'can_approve' => ($payment->status === 'pending_management_approval' && $canApproveManagement) ||
                                        ($payment->status === 'pending_accountant_confirmation' && $canApproveAccountant),
                        'approval_level' => $payment->status === 'pending_management_approval' ? 'management' : 'accountant',
                    ];
                }
            }
        }

        // ================================================================
        // 8. CONTRACTS (Hợp đồng chờ KH duyệt)
        // ================================================================
        if ($type === 'all' || $type === 'contract') {
            $contracts = Contract::where('status', 'pending_customer_approval')
                ->with(['project:id,name,code'])
                ->orderBy('updated_at', 'desc')
                ->get();

            if ($contracts->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'contract',
                    'label' => 'HĐ chờ KH',
                    'icon' => 'document-text-outline',
                    'color' => '#6366F1',
                    'total' => $contracts->count(),
                ];

                foreach ($contracts as $contract) {
                    $result['items'][] = [
                        'id' => $contract->id,
                        'type' => 'contract',
                        'title' => $contract->name ?? "HĐ #{$contract->id}",
                        'subtitle' => ($contract->project->code ?? '') . ' - ' . ($contract->project->name ?? 'Dự án'),
                        'amount' => (float) ($contract->total_value ?? 0),
                        'status' => $contract->status,
                        'status_label' => 'Chờ KH duyệt',
                        'created_by' => 'Hệ thống',
                        'created_at' => $contract->updated_at->toISOString(),
                        'description' => $contract->description ?? null,
                        'project_id' => $contract->project_id,
                        'route' => "/projects/{$contract->project_id}/contract",
                        'can_approve' => true,
                        'approval_level' => 'customer',
                    ];
                }
            }
        }

        // ================================================================
        // 9. PROJECT PAYMENTS (Thanh toán DA chờ KH duyệt)
        // ================================================================
        if ($type === 'all' || $type === 'payment') {
            $payments = ProjectPayment::where('status', 'customer_pending_approval')
                ->with(['project:id,name,code', 'contract:id,name'])
                ->orderBy('updated_at', 'desc')
                ->get();

            if ($payments->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'payment',
                    'label' => 'TT chờ KH',
                    'icon' => 'cash-outline',
                    'color' => '#D946EF',
                    'total' => $payments->count(),
                ];

                foreach ($payments as $payment) {
                    $result['items'][] = [
                        'id' => $payment->id,
                        'type' => 'payment',
                        'title' => 'Đợt ' . ($payment->payment_number ?? $payment->id),
                        'subtitle' => ($payment->project->code ?? '') . ' - ' . ($payment->project->name ?? 'Dự án'),
                        'amount' => (float) ($payment->amount ?? 0),
                        'status' => $payment->status,
                        'status_label' => 'Chờ KH duyệt',
                        'created_by' => 'Hệ thống',
                        'created_at' => $payment->updated_at->toISOString(),
                        'description' => $payment->description ?? ('HĐ: ' . ($payment->contract->name ?? 'N/A')),
                        'project_id' => $payment->project_id,
                        'route' => "/projects/{$payment->project_id}/payments",
                        'can_approve' => true,
                        'approval_level' => 'customer',
                    ];
                }
            }
        }

        // ================================================================
        // 10. SUBCONTRACTOR ACCEPTANCES (Nghiệm thu NTP)
        // ================================================================
        if ($type === 'all' || $type === 'sub_acceptance') {
            $subAcceptances = SubcontractorAcceptance::where('status', 'pending')
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($subAcceptances->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'sub_acceptance',
                    'label' => 'NT NTP',
                    'icon' => 'checkbox-outline',
                    'color' => '#0D9488',
                    'total' => $subAcceptances->count(),
                ];

                foreach ($subAcceptances as $sa) {
                    $result['items'][] = [
                        'id' => $sa->id,
                        'type' => 'sub_acceptance',
                        'title' => $sa->name ?? 'Nghiệm thu NTP',
                        'subtitle' => ($sa->project->code ?? '') . ' - ' . ($sa->project->name ?? 'Dự án'),
                        'amount' => (float) ($sa->amount ?? 0),
                        'status' => $sa->status,
                        'status_label' => 'Chờ duyệt',
                        'created_by' => $sa->creator->name ?? 'N/A',
                        'created_at' => $sa->created_at->toISOString(),
                        'description' => $sa->notes ?? null,
                        'project_id' => $sa->project_id,
                        'subcontractor_name' => $sa->subcontractor->name ?? null,
                        'route' => "/settings/subcontractor-acceptances",
                        'can_approve' => true,
                        'approval_level' => 'sub_acceptance',
                    ];
                }
            }
        }

        // ================================================================
        // 11. SUPPLIER ACCEPTANCES (Nghiệm thu NCC)
        // ================================================================
        if ($type === 'all' || $type === 'supplier_acceptance') {
            $supplierAcceptances = SupplierAcceptance::where('status', 'pending')
                ->with(['supplier:id,name', 'project:id,name,code', 'creator:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($supplierAcceptances->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'supplier_acceptance',
                    'label' => 'NT NCC',
                    'icon' => 'storefront-outline',
                    'color' => '#84CC16',
                    'total' => $supplierAcceptances->count(),
                ];

                foreach ($supplierAcceptances as $sa) {
                    $result['items'][] = [
                        'id' => $sa->id,
                        'type' => 'supplier_acceptance',
                        'title' => $sa->name ?? 'Nghiệm thu NCC',
                        'subtitle' => ($sa->project->code ?? '') . ' - ' . ($sa->project->name ?? 'Dự án'),
                        'amount' => (float) ($sa->amount ?? 0),
                        'status' => $sa->status,
                        'status_label' => 'Chờ duyệt',
                        'created_by' => $sa->creator->name ?? 'N/A',
                        'created_at' => $sa->created_at->toISOString(),
                        'description' => $sa->notes ?? null,
                        'project_id' => $sa->project_id,
                        'supplier_name' => $sa->supplier->name ?? null,
                        'route' => "/settings/supplier-acceptances",
                        'can_approve' => true,
                        'approval_level' => 'supplier_acceptance',
                    ];
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
     * Supports ALL 11 approval types.
     */
    public function quickApprove(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance',
            'id' => 'required|integer',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // ─── RBAC: Check permission before approving ───
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        try {
            DB::beginTransaction();

            switch ($type) {
                // ─── Cost (Company + Project) ───
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($id);

                    if ($cost->status === 'pending_management_approval') {
                        if (!$cost->approveByManagement($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể duyệt'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt chi phí (Ban điều hành)']);
                    }

                    if ($cost->status === 'pending_accountant_approval') {
                        if (!$cost->approveByAccountant($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể xác nhận'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận chi phí (Kế toán)']);
                    }

                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Chi phí không ở trạng thái chờ duyệt'], 400);

                // ─── Material Bill ───
                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (!class_exists($billClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $bill = $billClass::findOrFail($id);

                    if ($bill->status === 'pending_management' && method_exists($bill, 'approveByManagement')) {
                        $bill->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt phiếu vật tư (BĐH)']);
                    }
                    if ($bill->status === 'pending_accountant' && method_exists($bill, 'approveByAccountant')) {
                        $bill->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận phiếu vật tư (KT)']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu không ở trạng thái chờ duyệt'], 400);

                // ─── Acceptance Stage (KH duyệt) ───
                case 'acceptance':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'project_manager_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$stage->approveCustomer($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu (Khách hàng)']);

                // ─── Change Request ───
                case 'change_request':
                    $cr = ChangeRequest::findOrFail($id);
                    if (!in_array($cr->status, ['submitted', 'under_review'])) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Yêu cầu thay đổi không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$cr->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt yêu cầu thay đổi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt yêu cầu thay đổi']);

                // ─── Additional Cost ───
                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($id);
                    if (!in_array($ac->status, ['pending', 'pending_approval'])) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Chi phí phát sinh không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$ac->approve($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt chi phí phát sinh'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt chi phí phát sinh']);

                // ─── Subcontractor Payment ───
                case 'sub_payment':
                    $sp = SubcontractorPayment::findOrFail($id);
                    if ($sp->status === 'pending_management_approval') {
                        if (!$sp->approve($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể duyệt thanh toán NTP'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt thanh toán NTP (BĐH)']);
                    }
                    if ($sp->status === 'pending_accountant_confirmation') {
                        if (!$sp->markAsPaid($user)) {
                            DB::rollBack();
                            return response()->json(['success' => false, 'message' => 'Không thể xác nhận thanh toán NTP'], 400);
                        }
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận thanh toán NTP (Kế toán)']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Thanh toán NTP không ở trạng thái chờ duyệt'], 400);

                // ─── Contract (KH duyệt) ───
                case 'contract':
                    $contract = Contract::findOrFail($id);
                    if ($contract->status !== 'pending_customer_approval') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Hợp đồng không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$contract->approve($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt hợp đồng'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt hợp đồng']);

                // ─── Project Payment (KH duyệt) ───
                case 'payment':
                    $payment = ProjectPayment::findOrFail($id);
                    if ($payment->status !== 'customer_pending_approval') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Thanh toán không ở trạng thái chờ KH duyệt'], 400);
                    }
                    if (!$payment->approveByCustomer($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt thanh toán'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt đợt thanh toán (Khách hàng)']);

                // ─── Subcontractor Acceptance ───
                case 'sub_acceptance':
                    $sa = SubcontractorAcceptance::findOrFail($id);
                    if ($sa->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu NTP không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$sa->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu NTP'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu NTP']);

                // ─── Supplier Acceptance ───
                case 'supplier_acceptance':
                    $sa = SupplierAcceptance::findOrFail($id);
                    if ($sa->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu NCC không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$sa->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu NCC'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu NCC']);
            }

            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Loại không hợp lệ'], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Quick reject action directly from approval center.
     * Supports ALL 11 approval types.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance',
            'id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();

        // ─── RBAC: Check permission before rejecting ───
        $permCheck = $this->checkApprovalPermission($user, $request->type, $request->id);
        if ($permCheck !== true) {
            return $permCheck;
        }

        try {
            DB::beginTransaction();

            switch ($request->type) {
                case 'company_cost':
                case 'project_cost':
                    $cost = Cost::findOrFail($request->id);
                    if (!$cost->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối chi phí']);

                case 'material_bill':
                    $billClass = 'App\\Models\\MaterialBill';
                    if (!class_exists($billClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $bill = $billClass::findOrFail($request->id);
                    if (method_exists($bill, 'reject')) {
                        $bill->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối phiếu vật tư']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Không thể từ chối'], 400);

                case 'acceptance':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if (!$stage->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu']);

                case 'change_request':
                    $cr = ChangeRequest::findOrFail($request->id);
                    if (!$cr->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối yêu cầu thay đổi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối yêu cầu thay đổi']);

                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($request->id);
                    if (!$ac->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối CP phát sinh'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối chi phí phát sinh']);

                case 'sub_payment':
                    $sp = SubcontractorPayment::findOrFail($request->id);
                    if (!$sp->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối thanh toán NTP'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối thanh toán NTP']);

                case 'contract':
                    $contract = Contract::findOrFail($request->id);
                    $contract->reject($request->reason);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối hợp đồng']);

                case 'payment':
                    $payment = ProjectPayment::findOrFail($request->id);
                    $payment->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối đợt thanh toán']);

                case 'sub_acceptance':
                    $sa = SubcontractorAcceptance::findOrFail($request->id);
                    $sa->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu NTP']);

                case 'supplier_acceptance':
                    $sa = SupplierAcceptance::findOrFail($request->id);
                    $sa->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu NCC']);
            }

            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Loại không hợp lệ'], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * RBAC: Check if user has the correct permission for the given approval type.
     * Returns true if allowed, or a JsonResponse (403) if not.
     *
     * @param \App\Models\User $user
     * @param string $type  Approval type key
     * @param int $id       Item ID (used for status-dependent checks like costs)
     * @return true|\Illuminate\Http\JsonResponse
     */
    private function checkApprovalPermission($user, string $type, int $id)
    {
        // Owner (super admin flag) bypasses all checks
        if ($user->owner) {
            return true;
        }

        switch ($type) {
            case 'company_cost':
            case 'project_cost':
                $cost = Cost::find($id);
                if ($cost && $cost->status === 'pending_management_approval') {
                    if (!$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).'
                        ], 403);
                    }
                } elseif ($cost && $cost->status === 'pending_accountant_approval') {
                    if (!$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).'
                        ], 403);
                    }
                }
                break;

            case 'material_bill':
                if (!$user->hasPermission(Permissions::MATERIAL_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt phiếu vật tư.'
                    ], 403);
                }
                break;

            case 'acceptance':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_3)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (Khách hàng).'
                    ], 403);
                }
                break;

            case 'change_request':
                if (!$user->hasPermission(Permissions::CHANGE_REQUEST_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt yêu cầu thay đổi.'
                    ], 403);
                }
                break;

            case 'additional_cost':
                if (!$user->hasPermission(Permissions::ADDITIONAL_COST_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt chi phí phát sinh.'
                    ], 403);
                }
                break;

            case 'sub_payment':
                $sp = SubcontractorPayment::find($id);
                if ($sp && $sp->status === 'pending_management_approval') {
                    if (!$user->hasPermission(Permissions::SUBCONTRACTOR_PAYMENT_APPROVE)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền duyệt thanh toán NTP.'
                        ], 403);
                    }
                } elseif ($sp && $sp->status === 'pending_accountant_confirmation') {
                    if (!$user->hasPermission(Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Bạn không có quyền xác nhận thanh toán NTP (Kế toán).'
                        ], 403);
                    }
                }
                break;

            case 'contract':
                if (!$user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::CONTRACT_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt hợp đồng.'
                    ], 403);
                }
                break;

            case 'payment':
                if (!$user->hasPermission(Permissions::PAYMENT_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt thanh toán dự án.'
                    ], 403);
                }
                break;

            case 'sub_acceptance':
                if (!$user->hasPermission(Permissions::SUPPLIER_ACCEPTANCE_VIEW)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu NTP.'
                    ], 403);
                }
                break;

            case 'supplier_acceptance':
                if (!$user->hasPermission(Permissions::SUPPLIER_ACCEPTANCE_VIEW)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu NCC.'
                    ], 403);
                }
                break;
        }

        return true;
    }

    private function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Nháp',
            'pending', 'pending_approval' => 'Chờ duyệt',
            'pending_management_approval', 'pending_management' => 'Chờ BĐH duyệt',
            'pending_accountant_approval', 'pending_accountant' => 'Chờ KT xác nhận',
            'pending_accountant_confirmation' => 'Chờ KT xác nhận',
            'pending_customer_approval', 'customer_pending_approval' => 'Chờ KH duyệt',
            'project_manager_approved' => 'Chờ KH duyệt',
            'submitted' => 'Đã gửi',
            'under_review' => 'Đang xem xét',
            'approved', 'customer_approved' => 'Đã duyệt',
            'paid', 'customer_paid' => 'Đã thanh toán',
            'rejected' => 'Từ chối',
            default => $status,
        };
    }
}
