<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\ConstructionLog;
use App\Models\ScheduleAdjustment;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use App\Models\SubcontractorPayment;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Models\Defect;
use App\Models\ProjectBudget;
use App\Models\EquipmentRental;
use App\Models\AssetUsage;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

        // RBAC: Get projects assigned to user (unless super admin)
        $isSuperAdmin = $user->isSuperAdmin();
        $myProjectIds = $isSuperAdmin ? [] : $user->projects()->pluck('projects.id')->toArray();

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
                    ->withCount('attachments')
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
                        'attachments_count' => (int) ($cost->attachments_count ?? 0),
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
                    ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                    ->where('status', 'pending_management_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                $projectCosts = $projectCosts->merge($mgmtPending);
            }

            if ($canApproveAccountant) {
                $acctPending = Cost::whereNotNull('project_id')
                    ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                    ->where('status', 'pending_accountant_approval')
                    ->with(['creator:id,name,email', 'costGroup:id,name', 'project:id,name,code', 'managementApprover:id,name'])
                    ->withCount('attachments')
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
                        'attachments_count' => (int) ($cost->attachments_count ?? 0),
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
                    ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                    ->with(['creator:id,name,email', 'project:id,name,code'])
                    ->withCount('attachments')
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
                            'attachments_count' => (int) ($bill->attachments_count ?? 0),
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
        // 4a. ACCEPTANCE STAGES — chờ GS duyệt (pending)
        // ================================================================
        if ($type === 'all' || $type === 'acceptance_supervisor') {
            $acceptanceSupervisor = AcceptanceStage::where('status', 'pending')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code,project_manager_id', 'project.projectManager:id,name', 'task:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($acceptanceSupervisor->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'acceptance_supervisor',
                    'label' => 'NT chờ GS',
                    'icon' => 'eye-outline',
                    'color' => '#0D9488',
                    'total' => $acceptanceSupervisor->count(),
                ];

                foreach ($acceptanceSupervisor as $stage) {
                    $result['items'][] = [
                        'id' => $stage->id,
                        'type' => 'acceptance_supervisor',
                        'title' => $stage->name,
                        'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $stage->status,
                        'status_label' => 'Chờ GS duyệt',
                        'created_by' => $stage->project?->projectManager?->name ?? 'N/A',
                        'created_at' => $stage->created_at->toISOString(),
                        'description' => $stage->description ?? null,
                        'project_id' => $stage->project_id,
                        'route' => "/projects/{$stage->project_id}/acceptance",
                        'can_approve' => true,
                        'approval_level' => 'supervisor',
                    ];
                }
            }
        }

        // ================================================================
        // 4b. ACCEPTANCE STAGES — chờ QLDA duyệt (supervisor_approved)
        // ================================================================
        if ($type === 'all' || $type === 'acceptance_pm') {
            $acceptancePM = AcceptanceStage::where('status', 'supervisor_approved')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'supervisorApprover:id,name', 'task:id,name'])
                ->orderBy('updated_at', 'desc')
                ->get();

            if ($acceptancePM->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'acceptance_pm',
                    'label' => 'NT chờ QLDA',
                    'icon' => 'person-outline',
                    'color' => '#3B82F6',
                    'total' => $acceptancePM->count(),
                ];

                foreach ($acceptancePM as $stage) {
                    $result['items'][] = [
                        'id' => $stage->id,
                        'type' => 'acceptance_pm',
                        'title' => $stage->name,
                        'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $stage->status,
                        'status_label' => 'Chờ QLDA duyệt',
                        'created_by' => $stage->supervisorApprover->name ?? 'GS',
                        'created_at' => $stage->updated_at->toISOString(),
                        'description' => $stage->description ?? null,
                        'project_id' => $stage->project_id,
                        'route' => "/projects/{$stage->project_id}/acceptance",
                        'can_approve' => true,
                        'approval_level' => 'project_manager',
                    ];
                }
            }
        }

        // ================================================================
        // 4c. ACCEPTANCE STAGES — chờ KH duyệt (project_manager_approved)
        // ================================================================
        if ($type === 'all' || $type === 'acceptance') {
            $acceptanceStages = AcceptanceStage::where('status', 'project_manager_approved')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'proposer:id,name,email'])
                ->withCount('attachments')
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
                        'attachments_count' => (int) ($ac->attachments_count ?? 0),
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['subcontractor:id,name', 'project:id,name,code', 'creator:id,name,email', 'approver:id,name'])
                ->withCount('attachments')
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
                        'attachments_count' => (int) ($payment->attachments_count ?? 0),
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'contract:id,uuid,contract_value'])
                ->withCount('attachments')
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
                        'description' => $payment->description ?? ('HĐ: ' . ($payment->contract->uuid ?? 'N/A')),
                        'project_id' => $payment->project_id,
                        'attachments_count' => (int) ($payment->attachments_count ?? 0),
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
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
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
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

        // ================================================================
        // 12. ACCEPTANCE ITEMS (Nghiệm thu hạng mục)
        // ================================================================
        if ($type === 'all' || $type === 'acceptance_item') {
            $acceptanceItems = AcceptanceItem::where('acceptance_status', 'pending')
                ->whereDate('end_date', '<=', now())
                ->whereHas('acceptanceStage', function($q) use ($isSuperAdmin, $myProjectIds) {
                    $q->when(!$isSuperAdmin, fn($sq) => $sq->whereIn('project_id', $myProjectIds));
                })
                ->with(['acceptanceStage.project:id,name,code', 'creator:id,name', 'task:id,name'])
                ->orderBy('end_date', 'asc')
                ->get();

            if ($acceptanceItems->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'acceptance_item',
                    'label' => 'NT Hạng mục',
                    'icon' => 'list-outline',
                    'color' => '#14B8A6',
                    'total' => $acceptanceItems->count(),
                ];

                foreach ($acceptanceItems as $ai) {
                    $project = $ai->acceptanceStage?->project;
                    $result['items'][] = [
                        'id' => $ai->id,
                        'type' => 'acceptance_item',
                        'title' => $ai->name ?? 'Hạng mục nghiệm thu',
                        'subtitle' => ($project?->code ?? '') . ' - ' . ($project?->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $ai->acceptance_status,
                        'status_label' => 'Chờ nghiệm thu',
                        'created_by' => $ai->creator?->name ?? 'N/A',
                        'created_at' => $ai->updated_at->toISOString(),
                        'description' => $ai->task?->name ? 'Công việc: ' . $ai->task->name : ($ai->description ?? null),
                        'project_id' => $project?->id,
                        'route' => "/projects/{$project?->id}/acceptance",
                        'can_approve' => true,
                        'approval_level' => 'acceptance_item',
                    ];
                }
            }
        }

        // ================================================================
        // 13. CONSTRUCTION LOGS (Nhật ký công trường chờ duyệt)
        // ================================================================
        if ($type === 'all' || $type === 'construction_log') {
            $pendingLogs = ConstructionLog::where('approval_status', 'pending')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'creator:id,name', 'task:id,name'])
                ->orderBy('log_date', 'desc')
                ->get();

            if ($pendingLogs->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'construction_log',
                    'label' => 'Nhật ký CT',
                    'icon' => 'newspaper-outline',
                    'color' => '#A855F7',
                    'total' => $pendingLogs->count(),
                ];

                foreach ($pendingLogs as $log) {
                    $result['items'][] = [
                        'id' => $log->id,
                        'type' => 'construction_log',
                        'title' => 'Nhật ký ' . ($log->log_date?->format('d/m/Y') ?? 'N/A'),
                        'subtitle' => ($log->project?->code ?? '') . ' - ' . ($log->project?->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $log->approval_status,
                        'status_label' => 'Chờ duyệt',
                        'created_by' => $log->creator?->name ?? 'N/A',
                        'created_at' => $log->created_at->toISOString(),
                        'description' => $log->notes ?? ($log->task?->name ? 'Công việc: ' . $log->task->name : null),
                        'project_id' => $log->project_id,
                        'route' => "/projects/{$log->project_id}",
                        'can_approve' => true,
                        'approval_level' => 'construction_log',
                    ];
                }
            }
        }

        // ================================================================
        // 14. SCHEDULE ADJUSTMENTS (Điều chỉnh tiến độ)
        // ================================================================
        if ($type === 'all' || $type === 'schedule_adjustment') {
            $adjustments = ScheduleAdjustment::where('status', 'pending')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'creator:id,name,email', 'task:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($adjustments->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'schedule_adjustment',
                    'label' => 'Điều chỉnh TĐ',
                    'icon' => 'calendar-outline',
                    'color' => '#E11D48',
                    'total' => $adjustments->count(),
                ];

                foreach ($adjustments as $adj) {
                    $delayInfo = $adj->delay_days ? "Trễ {$adj->delay_days} ngày" : null;
                    $result['items'][] = [
                        'id' => $adj->id,
                        'type' => 'schedule_adjustment',
                        'title' => ($adj->task?->name ?? 'Điều chỉnh') . ($delayInfo ? " ({$delayInfo})" : ''),
                        'subtitle' => ($adj->project?->code ?? '') . ' - ' . ($adj->project?->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $adj->status,
                        'status_label' => 'Chờ duyệt',
                        'created_by' => $adj->creator?->name ?? 'N/A',
                        'created_at' => $adj->created_at->toISOString(),
                        'description' => $adj->reason ?? $adj->impact_analysis,
                        'project_id' => $adj->project_id,
                        'priority' => $adj->priority,
                        'route' => "/projects/{$adj->project_id}",
                        'can_approve' => true,
                        'approval_level' => 'schedule_adjustment',
                    ];
                }
            }
        }

        // ================================================================
        // 15. DEFECTS (Lỗi chờ xác nhận đã sửa)
        // ================================================================
        if ($type === 'all' || $type === 'defect') {
            $defects = \App\Models\Defect::where('status', 'fixed')
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'fixer:id,name', 'reporter:id,name'])
                ->orderBy('fixed_at', 'desc')
                ->get();

            if ($defects->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'defect',
                    'label' => 'Xác nhận sửa lỗi',
                    'icon' => 'bug-outline',
                    'color' => '#F43F5E',
                    'total' => $defects->count(),
                ];

                foreach ($defects as $defect) {
                    $result['items'][] = [
                        'id' => $defect->id,
                        'type' => 'defect',
                        'title' => 'Lỗi: ' . Str::limit($defect->description, 50),
                        'subtitle' => ($defect->project->code ?? '') . ' - ' . ($defect->project->name ?? 'Dự án'),
                        'amount' => 0,
                        'status' => $defect->status,
                        'status_label' => 'Đã sửa - Chờ xác nhận',
                        'created_by' => $defect->fixer->name ?? 'N/A',
                        'created_at' => $defect->fixed_at?->toISOString() ?? $defect->updated_at->toISOString(),
                        'description' => $defect->description,
                        'project_id' => $defect->project_id,
                        'priority' => $defect->severity, // Map severity to priority for UI consistency
                        'route' => "/projects/{$defect->project_id}/defects",
                        'can_approve' => true,
                        'approval_level' => 'defect_verify',
                    ];
                }
            }
        }

        // ================================================================
        // 16. PROJECT BUDGETS (Duyệt ngân sách dự án)
        // ================================================================
        if ($type === 'all' || $type === 'budget') {
            $budgets = \App\Models\ProjectBudget::whereIn('status', ['draft', 'pending_approval'])
                ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                ->with(['project:id,name,code', 'creator:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($budgets->isNotEmpty()) {
                $result['summary'][] = [
                    'type' => 'budget',
                    'label' => 'Ngân sách dự án',
                    'icon' => 'pie-chart-outline',
                    'color' => '#8B5CF6',
                    'total' => $budgets->count(),
                ];

                foreach ($budgets as $budget) {
                    $result['items'][] = [
                        'id' => $budget->id,
                        'type' => 'budget',
                        'title' => $budget->name ?? ("Ngân sách v" . ($budget->version ?? '1.0')),
                        'subtitle' => ($budget->project->code ?? '') . ' - ' . ($budget->project->name ?? 'Dự án'),
                        'amount' => (float) ($budget->total_budget ?? 0),
                        'status' => $budget->status,
                        'status_label' => 'Bản nháp - Chờ duyệt',
                        'created_by' => $budget->creator->name ?? 'N/A',
                        'created_at' => $budget->created_at->toISOString(),
                        'description' => $budget->notes,
                        'project_id' => $budget->project_id,
                        'route' => "/projects/{$budget->project_id}/budgets",
                        'can_approve' => $canApproveManagement,
                        'approval_level' => 'management',
                    ];
                }
            }
        }

        // ================================================================
        // 17. EQUIPMENT RENTALS (Thuê thiết bị)
        // ================================================================
        if ($type === 'all' || $type === 'equipment_rental') {
            $equipmentRentalClass = 'App\\Models\\EquipmentRental';
            if (class_exists($equipmentRentalClass)) {
                $rentals = $equipmentRentalClass::whereIn('status', ['pending_management', 'pending_accountant', 'pending_return'])
                    ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                    ->with(['project:id,name,code', 'creator:id,name,email'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                if ($rentals->isNotEmpty()) {
                    $result['summary'][] = [
                        'type' => 'equipment_rental',
                        'label' => 'Thuê thiết bị',
                        'icon' => 'construct-outline',
                        'color' => '#06B6D4',
                        'total' => $rentals->count(),
                        'pending_management' => $rentals->where('status', 'pending_management')->count(),
                        'pending_accountant' => $rentals->where('status', 'pending_accountant')->count(),
                    ];

                    foreach ($rentals as $rental) {
                        $level = match($rental->status) {
                            'pending_management' => 'management',
                            'pending_accountant' => 'accountant',
                            'pending_return' => 'management',
                            default => 'management',
                        };
                        $result['items'][] = [
                            'id' => $rental->id,
                            'type' => 'equipment_rental',
                            'title' => $rental->equipment_name ?? $rental->name ?? "Thuê TB #{$rental->id}",
                            'subtitle' => ($rental->project->code ?? '') . ' - ' . ($rental->project->name ?? 'Dự án'),
                            'amount' => (float) ($rental->total_cost ?? $rental->rental_cost ?? 0),
                            'status' => $rental->status,
                            'status_label' => $this->getStatusLabel($rental->status),
                            'created_by' => $rental->creator->name ?? 'N/A',
                            'created_at' => $rental->created_at->toISOString(),
                            'description' => $rental->notes ?? null,
                            'project_id' => $rental->project_id,
                            'route' => "/projects/{$rental->project_id}",
                            'can_approve' => ($rental->status === 'pending_management' && $canApproveManagement) ||
                                            ($rental->status === 'pending_accountant' && $canApproveAccountant) ||
                                            ($rental->status === 'pending_return'),
                            'approval_level' => $level,
                        ];
                    }
                }
            }
        }

        // ================================================================
        // 18. ASSET USAGES (Sử dụng thiết bị từ kho)
        // ================================================================
        if ($type === 'all' || $type === 'asset_usage') {
            $assetUsageClass = 'App\\Models\\AssetUsage';
            if (class_exists($assetUsageClass)) {
                $usages = $assetUsageClass::whereIn('status', ['pending_management', 'pending_accountant', 'pending_return'])
                    ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
                    ->with(['project:id,name,code', 'creator:id,name,email', 'asset:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                if ($usages->isNotEmpty()) {
                    $result['summary'][] = [
                        'type' => 'asset_usage',
                        'label' => 'Sử dụng TB',
                        'icon' => 'hardware-chip-outline',
                        'color' => '#3B82F6',
                        'total' => $usages->count(),
                        'pending_management' => $usages->where('status', 'pending_management')->count(),
                        'pending_accountant' => $usages->where('status', 'pending_accountant')->count(),
                    ];

                    foreach ($usages as $usage) {
                        $level = match($usage->status) {
                            'pending_management' => 'management',
                            'pending_accountant' => 'accountant',
                            'pending_return' => 'management',
                            default => 'management',
                        };
                        $result['items'][] = [
                            'id' => $usage->id,
                            'type' => 'asset_usage',
                            'title' => $usage->asset->name ?? "SD TB #{$usage->id}",
                            'subtitle' => ($usage->project->code ?? '') . ' - ' . ($usage->project->name ?? 'Dự án'),
                            'amount' => 0,
                            'status' => $usage->status,
                            'status_label' => $this->getStatusLabel($usage->status),
                            'created_by' => $usage->creator->name ?? 'N/A',
                            'created_at' => $usage->created_at->toISOString(),
                            'description' => $usage->notes ?? null,
                            'project_id' => $usage->project_id,
                            'route' => "/projects/{$usage->project_id}",
                            'can_approve' => ($usage->status === 'pending_management' && $canApproveManagement) ||
                                            ($usage->status === 'pending_accountant' && $canApproveAccountant) ||
                                            ($usage->status === 'pending_return'),
                            'approval_level' => $level,
                        ];
                    }
                }
            }
        }

        // ================================================================
        // 19. RECENT ACTIVITY (History) — Project-scoped
        // ================================================================
        $recentActions = collect();
        
        // Fetch recently approved/rejected costs (project-scoped)
        $recentCosts = Cost::whereIn('status', ['approved', 'rejected'])
            ->when(!$isSuperAdmin, fn($q) => $q->where(function($sq) use ($myProjectIds) {
                $sq->whereIn('project_id', $myProjectIds)->orWhereNull('project_id');
            }))
            ->with(['creator:id,name', 'costGroup:id,name', 'project:id,name,code', 'attachments'])
            ->where('updated_at', '>=', now()->subDays(7))
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();
            
        foreach ($recentCosts as $cost) {
            $recentActions->push([
                'id' => $cost->id,
                'type' => $cost->project_id ? 'project_cost' : 'company_cost',
                'title' => $cost->name,
                'subtitle' => $cost->project ? ($cost->project->code . ' - ' . $cost->project->name) : ($cost->costGroup->name ?? 'Chi phí'),
                'amount' => (float) $cost->amount,
                'status' => $cost->status,
                'status_label' => $this->getStatusLabel($cost->status),
                'created_by' => $cost->creator->name ?? 'N/A',
                'created_at' => $cost->created_at->toISOString(),
                'updated_at' => $cost->updated_at->toISOString(),
                'project_id' => $cost->project_id,
                'description' => $cost->description,
                'rejected_reason' => $cost->rejected_reason,
                'can_approve' => false,
                'approval_level' => 'history',
            ]);
        }

        // Fetch recently processed acceptance stages (project-scoped)
        $recentAcceptances = AcceptanceStage::whereIn('status', ['customer_approved', 'rejected'])
            ->when(!$isSuperAdmin, fn($q) => $q->whereIn('project_id', $myProjectIds))
            ->with(['project:id,name,code', 'task:id,name', 'attachments'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();
            
        foreach ($recentAcceptances as $stage) {
            $recentActions->push([
                'id' => $stage->id,
                'type' => 'acceptance',
                'title' => $stage->name,
                'subtitle' => ($stage->project->code ?? '') . ' - ' . ($stage->project->name ?? 'Dự án'),
                'amount' => 0,
                'status' => $stage->status,
                'status_label' => $this->getStatusLabel($stage->status),
                'created_by' => 'GS/QLDA',
                'created_at' => $stage->created_at->toISOString(),
                'updated_at' => $stage->updated_at->toISOString(),
                'project_id' => $stage->project_id,
                'rejected_reason' => $stage->rejected_reason,
                'can_approve' => false,
                'approval_level' => 'history',
            ]);
        }

        $result['recent_items'] = $recentActions->sortByDesc('updated_at')->values()->all();

        // ================================================================
        // STATS OVERVIEW — Project-scoped
        // ================================================================
        $pendingAmount = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])
            ->when(!$isSuperAdmin, fn($q) => $q->where(function($sq) use ($myProjectIds) {
                $sq->whereIn('project_id', $myProjectIds)->orWhereNull('project_id');
            }))
            ->sum('amount');
        $approvedToday = Cost::where('status', 'approved')->whereDate('updated_at', today())
            ->when(!$isSuperAdmin, fn($q) => $q->where(function($sq) use ($myProjectIds) {
                $sq->whereIn('project_id', $myProjectIds)->orWhereNull('project_id');
            }))
            ->count();
        $rejectedToday = Cost::where('status', 'rejected')->whereDate('updated_at', today())
            ->when(!$isSuperAdmin, fn($q) => $q->where(function($sq) use ($myProjectIds) {
                $sq->whereIn('project_id', $myProjectIds)->orWhereNull('project_id');
            }))
            ->count();
        
        $result['stats'] = [
            'pending_total' => array_sum(array_column($result['summary'], 'total')),
            'pending_amount' => (float) $pendingAmount,
            'approved_today' => (int) $approvedToday,
            'rejected_today' => (int) $rejectedToday,
        ];

        // ──────────────────────────────────────────────
        // Post-processing: Roles and Sorting
        // ──────────────────────────────────────────────

        // Inject required_role info into each item
        foreach ($result['items'] as &$item) {
            $roleInfo = $this->getRequiredRoleInfo($item['approval_level']);
            $item = array_merge($item, $roleInfo);
        }
        unset($item);

        foreach ($result['recent_items'] as &$item) {
            $roleInfo = $this->getRequiredRoleInfo($item['approval_level']);
            $item = array_merge($item, $roleInfo);
        }
        unset($item);

        // Sort all items by created_at desc
        usort($result['items'], function ($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        // Calculate grand total
        $result['grand_total'] = $result['stats']['pending_total'];

        // Include current user's roles
        $userRoles = [];
        if (method_exists($user, 'roles')) {
            $userRoles = $user->roles->pluck('name')->toArray();
        }
        $result['user_roles'] = $userRoles;

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }


    /**
     * Quick approve action directly from approval center.
     * Supports ALL 14 approval types.
     */
    public function quickApprove(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,acceptance_supervisor,acceptance_pm,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance,acceptance_item,construction_log,schedule_adjustment,defect,budget,equipment_rental,asset_usage',
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

                // ─── Acceptance Supervisor (GS duyệt) ───
                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ GS duyệt'], 400);
                    }
                    if (!$stage->approveSupervisor($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu (GS)'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'GS đã duyệt nghiệm thu']);

                // ─── Acceptance PM (QLDA duyệt) ───
                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($id);
                    if ($stage->status !== 'supervisor_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ QLDA duyệt'], 400);
                    }
                    if (!$stage->approveProjectManager($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt nghiệm thu (QLDA)'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'QLDA đã duyệt nghiệm thu']);

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

                // ─── Acceptance Item ───
                case 'acceptance_item':
                    $ai = AcceptanceItem::findOrFail($id);
                    if ($ai->acceptance_status !== 'pending' || !$ai->is_completed) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Hạng mục không ở trạng thái chờ nghiệm thu'], 400);
                    }
                    if (!$ai->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt hạng mục nghiệm thu'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu hạng mục']);

                // ─── Construction Log ───
                case 'construction_log':
                    $log = ConstructionLog::findOrFail($id);
                    if ($log->approval_status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nhật ký không ở trạng thái chờ duyệt'], 400);
                    }
                    $log->update([
                        'approval_status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt nhật ký công trường']);

                // ─── Schedule Adjustment ───
                case 'schedule_adjustment':
                    $adj = ScheduleAdjustment::findOrFail($id);
                    if ($adj->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Điều chỉnh không ở trạng thái chờ duyệt'], 400);
                    }
                    if (!$adj->approve($user, $request->notes)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể duyệt điều chỉnh tiến độ'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt điều chỉnh tiến độ']);

                // ─── Defect Verification ───
                case 'defect':
                    $defect = Defect::findOrFail($id);
                    if ($defect->status !== 'fixed') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Lỗi chưa được báo đã sửa'], 400);
                    }
                    if (!$defect->markAsVerified($user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể xác nhận lỗi'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã xác nhận lỗi đã sửa']);

                // ─── Project Budget ───
                case 'budget':
                    $budget = ProjectBudget::findOrFail($id);
                    if ($budget->status === 'approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Ngân sách đã được duyệt từ trước'], 400);
                    }
                    $budget->update([
                        'status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã duyệt ngân sách dự án']);

                // ─── Equipment Rental ───
                case 'equipment_rental':
                    $rentalClass = 'App\\Models\\EquipmentRental';
                    if (!class_exists($rentalClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $rental = $rentalClass::findOrFail($id);
                    if ($rental->status === 'pending_management' && method_exists($rental, 'approveByManagement')) {
                        $rental->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt thuê thiết bị (BĐH)']);
                    }
                    if ($rental->status === 'pending_accountant' && method_exists($rental, 'approveByAccountant')) {
                        $rental->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận thuê thiết bị (KT)']);
                    }
                    if ($rental->status === 'pending_return' && method_exists($rental, 'confirmReturn')) {
                        $rental->confirmReturn($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận trả thiết bị thuê']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu thuê không ở trạng thái chờ duyệt'], 400);

                // ─── Asset Usage ───
                case 'asset_usage':
                    $usageClass = 'App\\Models\\AssetUsage';
                    if (!class_exists($usageClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $usage = $usageClass::findOrFail($id);
                    if ($usage->status === 'pending_management' && method_exists($usage, 'approveByManagement')) {
                        $usage->approveByManagement($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã duyệt sử dụng thiết bị (BĐH)']);
                    }
                    if ($usage->status === 'pending_accountant' && method_exists($usage, 'approveByAccountant')) {
                        $usage->approveByAccountant($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận sử dụng thiết bị (KT)']);
                    }
                    if ($usage->status === 'pending_return' && method_exists($usage, 'confirmReturn')) {
                        $usage->confirmReturn($user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã xác nhận trả thiết bị kho']);
                    }
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Phiếu sử dụng TB không ở trạng thái chờ duyệt'], 400);
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
     * Supports ALL 14 approval types.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|in:company_cost,project_cost,material_bill,acceptance,acceptance_supervisor,acceptance_pm,change_request,additional_cost,sub_payment,contract,payment,sub_acceptance,supplier_acceptance,acceptance_item,construction_log,schedule_adjustment,defect,budget,equipment_rental,asset_usage',
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

                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if ($stage->status !== 'pending') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ GS duyệt'], 400);
                    }
                    $stage->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu (GS)']);

                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($request->id);
                    if ($stage->status !== 'supervisor_approved') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Nghiệm thu không ở trạng thái chờ QLDA duyệt'], 400);
                    }
                    $stage->reject($request->reason, $user);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu (QLDA)']);

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

                case 'acceptance_item':
                    $ai = AcceptanceItem::findOrFail($request->id);
                    if (!$ai->reject($request->reason, $user)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối hạng mục'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu hạng mục']);

                case 'construction_log':
                    $log = ConstructionLog::findOrFail($request->id);
                    $log->update([
                        'approval_status' => 'rejected',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối nhật ký công trường']);

                case 'schedule_adjustment':
                    $adj = ScheduleAdjustment::findOrFail($request->id);
                    if (!$adj->reject($user, $request->reason)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Không thể từ chối điều chỉnh tiến độ'], 400);
                    }
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối điều chỉnh tiến độ']);

                case 'defect':
                    $defect = Defect::findOrFail($request->id);
                    if ($defect->status !== 'fixed') {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Lỗi chưa được báo đã sửa'], 400);
                    }
                    $defect->update([
                        'status' => 'open',
                        'rejected_reason' => $request->reason,
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối xác nhận sửa lỗi']);

                case 'budget':
                    $budget = ProjectBudget::findOrFail($request->id);
                    $budget->update([
                        'status' => 'rejected',
                        'rejected_reason' => $request->reason,
                        'rejected_by' => $user->id,
                        'rejected_at' => now(),
                    ]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối ngân sách dự án']);

                case 'equipment_rental':
                    $rentalClass = 'App\\Models\\EquipmentRental';
                    if (!class_exists($rentalClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $rental = $rentalClass::findOrFail($request->id);
                    if (method_exists($rental, 'reject')) {
                        $rental->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối thuê thiết bị']);
                    }
                    $rental->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối thuê thiết bị']);

                case 'asset_usage':
                    $usageClass = 'App\\Models\\AssetUsage';
                    if (!class_exists($usageClass)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Module không tồn tại'], 400);
                    }
                    $usage = $usageClass::findOrFail($request->id);
                    if (method_exists($usage, 'reject')) {
                        $usage->reject($request->reason, $user);
                        DB::commit();
                        return response()->json(['success' => true, 'message' => 'Đã từ chối sử dụng thiết bị']);
                    }
                    $usage->update(['status' => 'rejected', 'rejected_reason' => $request->reason]);
                    DB::commit();
                    return response()->json(['success' => true, 'message' => 'Đã từ chối sử dụng thiết bị']);
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
        if ($user->owner || $user->isSuperAdmin()) {
            return true;
        }

        // Project-based filtering for relevant types
        $projectIds = $user->projects()->pluck('projects.id')->toArray();

        // ─── Project Assignment Check ───
        $modelMap = [
            'project_cost' => Cost::class,
            'material_bill' => 'App\\Models\\MaterialBill',
            'acceptance' => AcceptanceStage::class,
            'acceptance_supervisor' => AcceptanceStage::class,
            'acceptance_pm' => AcceptanceStage::class,
            'change_request' => ChangeRequest::class,
            'additional_cost' => AdditionalCost::class,
            'sub_payment' => SubcontractorPayment::class,
            'contract' => Contract::class,
            'payment' => ProjectPayment::class,
            'sub_acceptance' => SubcontractorAcceptance::class,
            'supplier_acceptance' => SupplierAcceptance::class,
            'acceptance_item' => AcceptanceItem::class,
            'construction_log' => ConstructionLog::class,
            'schedule_adjustment' => ScheduleAdjustment::class,
            'defect' => Defect::class,
            'budget' => ProjectBudget::class,
            'equipment_rental' => EquipmentRental::class,
            'asset_usage' => AssetUsage::class,
        ];

        if (isset($modelMap[$type])) {
            $modelClass = $modelMap[$type];
            if (class_exists($modelClass)) {
                $item = $modelClass::find($id);
                if ($item) {
                     $pid = null;
                     if (isset($item->project_id)) {
                         $pid = $item->project_id;
                     } elseif ($type === 'acceptance_item' && $item->acceptanceStage) {
                         $pid = $item->acceptanceStage->project_id;
                     }

                     if ($pid !== null && !in_array($pid, $projectIds)) {
                         return response()->json([
                             'success' => false,
                             'message' => 'Bạn không được phân công vào dự án này.'
                         ], 403);
                     }
                }
            }
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

            case 'acceptance_supervisor':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (Giám sát).'
                    ], 403);
                }
                break;

            case 'acceptance_pm':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nghiệm thu (QLDA).'
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

            case 'acceptance_item':
                if (!$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt hạng mục nghiệm thu.'
                    ], 403);
                }
                break;

            case 'construction_log':
                if (!$user->hasPermission(Permissions::LOG_UPDATE)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt nhật ký công trường.'
                    ], 403);
                }
                break;

            case 'schedule_adjustment':
                if (!$user->hasPermission(Permissions::GANTT_UPDATE)
                    && !$user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt điều chỉnh tiến độ.'
                    ], 403);
                }
                break;

            case 'defect':
                if (!$user->hasPermission(Permissions::DEFECT_VERIFY)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền xác nhận sửa lỗi.'
                    ], 403);
                }
                break;

            case 'budget':
                if (!$user->hasPermission(Permissions::BUDGET_APPROVE)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt ngân sách.'
                    ], 403);
                }
                break;

            case 'equipment_rental':
            case 'asset_usage':
                if (!$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)
                    && !$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền duyệt thiết bị.'
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
            'supervisor_approved' => 'Chờ QLDA duyệt',
            'submitted' => 'Đã gửi',
            'under_review' => 'Đang xem xét',
            'approved', 'customer_approved' => 'Đã duyệt',
            'paid', 'customer_paid' => 'Đã thanh toán',
            'rejected' => 'Từ chối',
            'fixed' => 'Đã sửa - Chờ xác nhận',
            'pending_return' => 'Chờ xác nhận trả',
            default => $status,
        };
    }

    /**
     * Map approval_level to the required role(s) and display labels.
     * This helps the APP show which role is needed for each approval item.
     */
    private function getRequiredRoleInfo(string $approvalLevel): array
    {
        return match ($approvalLevel) {
            'management' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Giám đốc / Ban ĐH',
                'required_role_short' => 'GĐ',
                'required_role_icon' => 'ribbon-outline',
                'required_role_color' => '#F97316',
            ],
            'accountant' => [
                'required_role' => 'accountant',
                'required_role_label' => 'Kế toán',
                'required_role_short' => 'KT',
                'required_role_icon' => 'calculator-outline',
                'required_role_color' => '#06B6D4',
            ],
            'customer' => [
                'required_role' => 'client',
                'required_role_label' => 'Khách hàng / Chủ ĐT',
                'required_role_short' => 'KH',
                'required_role_icon' => 'people-outline',
                'required_role_color' => '#10B981',
            ],
            'supervisor' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#0D9488',
            ],
            'project_manager' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'person-outline',
                'required_role_color' => '#3B82F6',
            ],
            'change_request' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'person-outline',
                'required_role_color' => '#3B82F6',
            ],
            'additional_cost' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý / Ban ĐH',
                'required_role_short' => 'QL',
                'required_role_icon' => 'briefcase-outline',
                'required_role_color' => '#F97316',
            ],
            'sub_acceptance' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#0D9488',
            ],
            'supplier_acceptance' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'eye-outline',
                'required_role_color' => '#84CC16',
            ],
            'acceptance_item' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'clipboard-outline',
                'required_role_color' => '#14B8A6',
            ],
            'construction_log' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý Dự án',
                'required_role_short' => 'QLDA',
                'required_role_icon' => 'newspaper-outline',
                'required_role_color' => '#A855F7',
            ],
            'schedule_adjustment' => [
                'required_role' => 'project_manager',
                'required_role_label' => 'Quản lý / Ban ĐH',
                'required_role_short' => 'QL',
                'required_role_icon' => 'calendar-outline',
                'required_role_color' => '#E11D48',
            ],
            'defect_verify' => [
                'required_role' => 'site_supervisor',
                'required_role_label' => 'Giám sát / QLDA',
                'required_role_short' => 'GS',
                'required_role_icon' => 'bug-outline',
                'required_role_color' => '#F43F5E',
            ],
            'equipment_rental' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Ban ĐH / Kế toán',
                'required_role_short' => 'BĐH',
                'required_role_icon' => 'construct-outline',
                'required_role_color' => '#06B6D4',
            ],
            'asset_usage' => [
                'required_role' => 'project_owner',
                'required_role_label' => 'Ban ĐH / Kế toán',
                'required_role_short' => 'BĐH',
                'required_role_icon' => 'hardware-chip-outline',
                'required_role_color' => '#3B82F6',
            ],
            default => [
                'required_role' => 'admin',
                'required_role_label' => 'Quản trị',
                'required_role_short' => 'QT',
                'required_role_icon' => 'shield-outline',
                'required_role_color' => '#6B7280',
            ],
        };
    }
}

