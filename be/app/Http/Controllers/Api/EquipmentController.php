<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentAllocation;
use App\Models\EquipmentMaintenance;
use App\Constants\Permissions;
use App\Services\EquipmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class EquipmentController extends Controller
{
    protected $equipmentService;

    public function __construct(\App\Services\EquipmentService $equipmentService)
    {
        $this->equipmentService = $equipmentService;
    }
    public function index(Request $request)
    {
        // Relaxed for project modules
        // if (!$user->hasPermission(Permissions::EQUIPMENT_VIEW)) { ... }

        $equipment = $this->equipmentService->getEquipment($request->only(['active_only', 'search', 'category', 'type', 'status']));

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo thiết bị.'
            ], 403);
        }

        try {
            $equipment = $this->equipmentService->upsert($request->all(), null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo thiết bị (Nháp). Vui lòng gửi duyệt.',
                'data' => $equipment->load('attachments')
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thiết bị.'
            ], 403);
        }

        $equipment = Equipment::with(['allocations.project', 'maintenances', 'attachments'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function getAllocations(string $id, Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem phân bổ thiết bị.'
            ], 403);
        }

        $query = EquipmentAllocation::where('equipment_id', $id)
            ->with(['project', 'allocatedTo', 'creator']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $allocations = $query->orderBy('start_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $allocations
        ]);
    }

    public function getMaintenance(string $id, Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem lịch bảo trì.'
            ], 403);
        }

        $query = EquipmentMaintenance::where('equipment_id', $id)
            ->with(['creator']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $maintenances = $query->orderBy('maintenance_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $maintenances
        ]);
    }

    /**
     * Lấy danh sách equipment đã được phân bổ cho project
     */
    public function getByProject(string $projectId, Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thiết bị dự án.'
            ], 403);
        }

        $equipment = $this->equipmentService->getEquipmentByProject((int)$projectId, $request->only(['allocation_status', 'search', 'category', 'type', 'status']));

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật thiết bị.'
            ], 403);
        }

        $equipment = Equipment::findOrFail($id);

        try {
            $this->equipmentService->upsert($request->all(), $equipment, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật thiết bị thành công.',
                'data' => $equipment->load('attachments')
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 403);
        }
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_DELETE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa thiết bị.'
            ], 403);
        }

        $equipment = Equipment::findOrFail($id);

        try {
            $this->equipmentService->delete($equipment);
            return response()->json([
                'success' => true,
                'message' => 'Đã xóa thiết bị thành công.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Tạo allocation cho equipment trong project
     */
    public function createAllocation(Request $request, string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission(Permissions::EQUIPMENT_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo phân bổ thiết bị.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'equipment_id' => 'required|exists:equipment,id',
            'allocation_type' => 'required|in:rent,buy',
            'quantity' => 'required|integer|min:1',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'allocated_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
            // Cho MUA (buy):
            'manager_id' => 'nullable|exists:users,id',
            'handover_date' => 'nullable|date',
            'return_date' => 'nullable|date|after_or_equal:handover_date',
            // Cho THUÊ (rent):
            'daily_rate' => 'nullable|numeric|min:0',
            'rental_fee' => 'nullable|numeric|min:0',
            'billing_start_date' => 'nullable|date',
            'billing_end_date' => 'nullable|date|after_or_equal:billing_start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->all();
            $data['project_id'] = $projectId;
            
            $allocation = $this->equipmentService->upsertAllocation($data, null, $user);
            $allocation->load(['equipment', 'project', 'allocatedTo', 'manager', 'creator', 'cost']);

            return response()->json([
                'success' => true,
                'message' => $request->allocation_type === 'buy' 
                    ? 'Đã phân bổ thiết bị (Có sẵn) thành công.' 
                    : 'Đã tạo phân bổ thiết bị (Thuê) thành công.',
                'data' => $allocation
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
}
