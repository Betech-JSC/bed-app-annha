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
use App\Models\Attendance;
use App\Constants\Permissions;
use App\Services\ApprovalQueryService;
use App\Services\ApprovalActionService;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApprovalCenterController extends Controller
{
    protected $approvalQueryService;
    protected $approvalActionService;
    protected $authService;

    public function __construct(
        ApprovalQueryService $approvalQueryService,
        ApprovalActionService $approvalActionService,
        AuthorizationService $authService
    ) {
        $this->approvalQueryService = $approvalQueryService;
        $this->approvalActionService = $approvalActionService;
        $this->authService = $authService;
    }

    /**
     * Get all pending approvals for the current user based on their permissions.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $type = $request->get('type', 'all');

        $result = $this->approvalQueryService->getMobileDashboardData($user, $type);

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
            'type' => 'required|string',
            'id' => 'required|integer',
            'notes' => 'nullable|string|max:500',
            'budget_item_id' => 'nullable|integer|exists:budget_items,id',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // RBAC Check
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) return $permCheck;

        // Budget Linking (Legacy support for accountant workflow)
        $this->handleBudgetLinking($type, $id, $request->budget_item_id);

        // Map to service type
        $serviceType = $this->mapToServiceType($type, $id);

        $result = $this->approvalActionService->approve($user, $serviceType, $id, ['notes' => $request->notes]);

        if ($result['success']) {
            return response()->json(['success' => true, 'message' => $result['message']]);
        }
        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }

    /**
     * Quick reject action directly from approval center.
     */
    public function quickReject(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) return $permCheck;

        $serviceType = $this->mapToServiceType($type, $id, true);

        $result = $this->approvalActionService->reject($user, $serviceType, $id, $request->reason);

        if ($result['success']) {
            return response()->json(['success' => true, 'message' => $result['message']]);
        }
        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }

    /**
     * Quick revert to draft action.
     */
    public function quickRevert(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
        ]);

        $user = Auth::user();
        $type = $request->type;
        $id = $request->id;

        // Permission check
        $permCheck = $this->checkApprovalPermission($user, $type, $id);
        if ($permCheck !== true) return $permCheck;

        $serviceType = $this->mapToServiceType($type, $id);

        $result = $this->approvalActionService->revert($user, $serviceType, $id);

        if ($result['success']) {
            return response()->json(['success' => true, 'message' => $result['message']]);
        }
        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }

    /**
     * Helper to map request type to service type.
     */
    private function mapToServiceType(string $type, int $id, bool $isReject = false): string
    {
        if ($type === 'project_cost' || $type === 'company_cost') {
            $cost = Cost::findOrFail($id);
            return ($cost->status === 'pending_accountant_approval') ? 'accountant' : 'management';
        }

        // ACCEPTANCE: Route to the correct approval level based on current stage status
        if ($type === 'acceptance') {
            if ($isReject) return 'acceptance'; // reject handler uses model detection
            $stage = AcceptanceStage::findOrFail($id);
            return match ($stage->status) {
                'pending', 'rejected' => 'acceptance_supervisor',
                'supervisor_approved' => 'acceptance_pm',
                'project_manager_approved' => 'acceptance_customer',
                default => 'acceptance',
            };
        }
        
        if ($type === 'equipment_rental') {
            if ($isReject) return 'equipment_rental_management';
            $rental = EquipmentRental::findOrFail($id);
            return match ($rental->status) {
                'pending_management' => 'equipment_rental_management',
                'pending_accountant' => 'equipment_rental_accountant',
                'pending_return' => 'equipment_rental_return',
                default => 'equipment_rental_management',
            };
        }

        if ($type === 'asset_usage') {
            if ($isReject) return 'asset_usage_management';
            $usage = AssetUsage::findOrFail($id);
            return match ($usage->status) {
                'pending_management' => 'asset_usage_management',
                'pending_accountant' => 'asset_usage_accountant',
                'pending_return' => 'asset_usage_return',
                default => 'asset_usage_management',
            };
        }

        if ($type === 'attendance') {
            return 'attendance';
        }

        if ($type === 'sub_payment') {
            $p = SubcontractorPayment::findOrFail($id);
            return ($p->status === 'pending_accountant_confirmation') ? 'sub_payment_confirm' : 'sub_payment';
        }

        if ($type === 'payment') {
            $p = ProjectPayment::findOrFail($id);
            if ($p->status === 'customer_paid') return 'project_payment_confirm';
            if ($p->status === 'pending' || $p->status === 'overdue') return 'project_payment_submit';
            return 'project_payment';
        }

        return $type;
    }

    /**
     * Handle budget linking for financial approvals.
     */
    private function handleBudgetLinking(string $type, int $id, $budgetItemId): void
    {
        if (!$budgetItemId) return;

        if ($type === 'project_cost' || $type === 'company_cost') {
            $cost = Cost::findOrFail($id);
            if ($cost->status === 'pending_accountant_approval') {
                $cost->update(['budget_item_id' => $budgetItemId]);
            }
        } elseif ($type === 'sub_payment') {
            $p = SubcontractorPayment::findOrFail($id);
            if ($p->status === 'pending_accountant_confirmation') {
                $p->update(['budget_item_id' => $budgetItemId]);
            }
        } elseif ($type === 'material_bill') {
            $b = \App\Models\MaterialBill::findOrFail($id);
            if ($b->status === 'pending_accountant') {
                $b->update(['budget_item_id' => $budgetItemId]);
            }
        }
    }

    /**
     * RBAC Permission mapping and checking.
     */
    private function checkApprovalPermission($user, string $type, int $id)
    {
        if ($user->owner || $user->isSuperAdmin()) return true;

        $modelMap = [
            'project_cost' => Cost::class,
            'material_bill' => 'App\\Models\\MaterialBill',
            'acceptance' => AcceptanceStage::class,
            'change_request' => ChangeRequest::class,
            'additional_cost' => AdditionalCost::class,
            'sub_payment' => SubcontractorPayment::class,
            'contract' => Contract::class,
            'payment' => ProjectPayment::class,
            'sub_acceptance' => SubcontractorAcceptance::class,
            'supplier_acceptance' => SupplierAcceptance::class,
            // 'construction_log' removed — BUSINESS RULE: Nhật ký không cần duyệt
            'schedule_adjustment' => ScheduleAdjustment::class,
            'defect' => Defect::class,
            'budget' => ProjectBudget::class,
            'equipment_rental' => EquipmentRental::class,
            'asset_usage' => AssetUsage::class,
        ];

        $permission = match ($type) {
            'company_cost', 'project_cost' => $this->getCostPermission($id),
            'material_bill' => Permissions::MATERIAL_APPROVE,
            'acceptance' => $this->getAcceptancePermission($id),
            'change_request' => Permissions::CHANGE_REQUEST_APPROVE,
            'additional_cost' => Permissions::ADDITIONAL_COST_APPROVE,
            'budget' => Permissions::BUDGET_APPROVE,
            'sub_payment' => Permissions::COST_APPROVE_MANAGEMENT,
            'sub_acceptance' => Permissions::SUBCONTRACTOR_APPROVE,
            'construction_log' => null, // BUSINESS RULE: Nhật ký không cần duyệt
            'defect' => Permissions::DEFECT_VERIFY,
            'contract' => Permissions::CONTRACT_APPROVE_LEVEL_2,
            'payment' => match($this->mapToServiceType('payment', $id)) {
                'project_payment_confirm' => Permissions::PAYMENT_CONFIRM,
                'project_payment_submit' => Permissions::PAYMENT_UPDATE,
                default => Permissions::PAYMENT_APPROVE,
            },
            default => null,
        };

        if (!$permission) return true; // No specific permission defined, allow service to handle

        // Find the item to get project context
        $project = null;
        if (isset($modelMap[$type])) {
            $modelClass = $modelMap[$type];
            if (class_exists($modelClass)) {
                $item = $modelClass::find($id);
                if ($item && isset($item->project_id)) {
                    $project = $item->project;
                }
            }
        }

        // Use AuthorizationService for uniform check
        if (!$this->authService->can($user, $permission, $project)) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        return true;
    }

    private function getCostPermission(int $id): ?string
    {
        $cost = Cost::find($id);
        if (!$cost) return null;
        return ($cost->status === 'pending_accountant_approval') 
            ? Permissions::COST_APPROVE_ACCOUNTANT 
            : Permissions::COST_APPROVE_MANAGEMENT;
    }

    /**
     * Determine acceptance permission based on current stage status.
     */
    private function getAcceptancePermission(int $id): ?string
    {
        $stage = AcceptanceStage::find($id);
        if (!$stage) return null;
        return match ($stage->status) {
            'pending', 'rejected' => Permissions::ACCEPTANCE_APPROVE_LEVEL_1,
            'supervisor_approved' => Permissions::ACCEPTANCE_APPROVE_LEVEL_2,
            'project_manager_approved' => Permissions::ACCEPTANCE_APPROVE_LEVEL_3,
            default => Permissions::ACCEPTANCE_APPROVE_LEVEL_3,
        };
    }
}
