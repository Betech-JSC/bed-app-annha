<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\Project;
use App\Models\Cost;
use App\Models\MaterialTransaction;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use App\Services\MaterialBillService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class MaterialBillController extends Controller
{
    protected $authService;
    protected $materialBillService;

    public function __construct(
        \App\Services\AuthorizationService $authService,
        MaterialBillService $materialBillService
    ) {
        $this->authService = $authService;
        $this->materialBillService = $materialBillService;
    }

    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem thông tin vật liệu dự án này.'
            ], 403);
        }

        $query = MaterialBill::with(['supplier', 'costGroup', 'creator'])
            ->where('project_id', $projectId);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->query('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('bill_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $bills = $query->orderByDesc('bill_date')->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bills
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo hóa đơn vật liệu cho dự án này.'
            ], 403);
        }

        try {
            $data = $request->all();
            $data['project_id'] = $projectId;

            $bill = $this->materialBillService->upsert($data, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hóa đơn vật liệu thành công.',
                'data' => $bill->load('items.material')
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error("Lỗi khi tạo hóa đơn vật liệu (API): " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hóa đơn vật liệu này.'
            ], 403);
        }

        $bill = MaterialBill::with(['supplier', 'costGroup', 'creator', 'items.material', 'managementApprover', 'accountantApprover'])
            ->where('project_id', $projectId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $bill
        ]);
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật hóa đơn này.'
            ], 403);
        }

        try {
            $this->materialBillService->upsert($request->all(), $bill, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hóa đơn thành công.',
                'data' => $bill->load('items.material')
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error("Lỗi khi cập nhật hóa đơn vật liệu (API): " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function submit(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt hóa đơn này.'
            ], 403);
        }

        try {
            $this->materialBillService->submit($bill, $user);
            return response()->json([
                'success' => true,
                'message' => 'Đã gửi hóa đơn cho Ban điều hành duyệt.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function approveManagement(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::with('items')->where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_MANAGEMENT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt hóa đơn này (BĐH).'
            ], 403);
        }

        try {
            $this->materialBillService->approve($bill, $user);
            return response()->json([
                'success' => true,
                'message' => 'Ban điều hành đã duyệt hóa đơn. Chờ Kế toán xác nhận.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function approveAccountant(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::with(['items.material', 'supplier'])->where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận hóa đơn này (Kế toán).'
            ], 403);
        }

        try {
            $this->materialBillService->approve($bill, $user, $request->only('budget_item_id'));
            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận thanh toán hóa đơn. Dữ liệu đã được đẩy qua Chi phí dự án và Kho vật liệu.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_REJECT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối hóa đơn này.'
            ], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        try {
            $this->materialBillService->reject($bill, $user, $request->reason);
            return response()->json([
                'success' => true,
                'message' => 'Hóa đơn đã bị từ chối.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Helper: Find and update linked Cost record for a MaterialBill
     * @deprecated Use model-driven sync instead
     */
    private function updateLinkedMaterialCost($projectId, string $billRef, string $newStatus, array $extra = []): ?Cost
    {
        $cost = Cost::where('material_bill_id', function($q) use ($billRef) {
            // This is just a fallback for old records without material_bill_id
             return null; 
        })->first();

        if (!$cost) {
             // Fallback to name search for legacy records
             $cost = Cost::where('project_id', $projectId)
                ->where('category', 'construction_materials')
                ->where('name', 'LIKE', "%#{$billRef}%")
                ->first();
        }

        if ($cost) {
            $cost->update(array_merge(['status' => $newStatus], $extra));
        }

        return $cost;
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa hóa đơn này.'
            ], 403);
        }

        try {
            $this->materialBillService->delete($bill);
            return response()->json([
                'success' => true,
                'message' => 'Hóa đơn đã được xóa.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Hoàn duyệt phiếu vật liệu về trạng thái nháp
     */
    public function revertToDraft(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_REVERT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hoàn duyệt phiếu vật liệu này.'
            ], 403);
        }

        try {
            $this->materialBillService->revertToDraft($bill, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã đưa phiếu vật liệu về trạng thái nháp.',
                'data' => $bill->fresh(['items.material', 'supplier', 'costGroup', 'creator'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }
}
