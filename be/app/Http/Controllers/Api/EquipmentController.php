<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentAllocation;
use App\Models\EquipmentMaintenance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem danh sách thiết bị.'
            ], 403);
        }

        $query = Equipment::query();

        if ($request->query('active_only') === 'true') {
            $query->where('status', 'available');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $equipment = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo thiết bị.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:equipment,code',
            'category' => 'nullable|string|max:100',
            'type' => 'required|in:owned,rented',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'rental_rate_per_day' => 'nullable|numeric|min:0',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'status' => 'in:available,in_use,maintenance,retired',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $equipment = Equipment::create([
            'name' => $request->name,
            'code' => $request->code,
            'category' => $request->category,
            'type' => $request->type,
            'brand' => $request->brand,
            'model' => $request->model,
            'serial_number' => $request->serial_number,
            'purchase_date' => $request->purchase_date,
            'purchase_price' => $request->purchase_price,
            'rental_rate_per_day' => $request->rental_rate_per_day,
            'maintenance_interval_days' => $request->maintenance_interval_days ?? 30,
            'status' => $request->status ?? 'available',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo thiết bị thành công.',
            'data' => $equipment
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thiết bị.'
            ], 403);
        }

        $equipment = Equipment::with(['allocations.project', 'maintenances'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function getAllocations(string $id, Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.view') && !$user->owner && $user->role !== 'admin') {
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
        
        if (!$user->hasPermission('equipment.view') && !$user->owner && $user->role !== 'admin') {
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
        
        if (!$user->hasPermission('equipment.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thiết bị dự án.'
            ], 403);
        }

        // Lấy các equipment đã có allocation trong project này
        $query = Equipment::whereHas('allocations', function ($q) use ($projectId) {
            $q->where('project_id', $projectId);
        })->with(['allocations' => function ($q) use ($projectId) {
            $q->where('project_id', $projectId)
                ->with(['allocatedTo', 'creator'])
                ->orderBy('start_date', 'desc');
        }]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $equipment = $query->paginate(20);

        // Thêm thông tin allocation cho project
        $equipment->getCollection()->transform(function ($item) use ($projectId) {
            $projectAllocations = $item->allocations->where('project_id', $projectId);
            $activeAllocation = $projectAllocations->where('status', 'active')->first();
            
            $item->project_allocation = $activeAllocation;
            $item->project_allocations_count = $projectAllocations->count();
            
            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật thiết bị.'
            ], 403);
        }

        $equipment = Equipment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50|unique:equipment,code,' . $id,
            'category' => 'nullable|string|max:100',
            'type' => 'sometimes|required|in:owned,rented',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'rental_rate_per_day' => 'nullable|numeric|min:0',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'status' => 'in:available,in_use,maintenance,retired',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $equipment->update($request->only([
            'name', 'code', 'category', 'type', 'brand', 'model', 'serial_number',
            'purchase_date', 'purchase_price', 'rental_rate_per_day',
            'maintenance_interval_days', 'status'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thiết bị thành công.',
            'data' => $equipment
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa thiết bị.'
            ], 403);
        }

        $equipment = Equipment::findOrFail($id);

        // Kiểm tra có phân bổ đang active không
        if ($equipment->allocations()->where('status', 'active')->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa thiết bị đang được sử dụng.'
            ], 422);
        }

        $equipment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa thiết bị thành công.'
        ]);
    }

    /**
     * Tạo allocation cho equipment trong project
     */
    public function createAllocation(Request $request, string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('equipment.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo phân bổ thiết bị.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'equipment_id' => 'required|exists:equipment,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'daily_rate' => 'nullable|numeric|min:0',
            'allocated_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra equipment có đang được sử dụng không
        $equipment = Equipment::findOrFail($request->equipment_id);
        $activeAllocation = $equipment->allocations()
            ->where('status', 'active')
            ->where(function ($q) use ($request) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', $request->start_date);
            })
            ->first();

        if ($activeAllocation) {
            return response()->json([
                'success' => false,
                'message' => 'Thiết bị đang được sử dụng trong khoảng thời gian này.'
            ], 422);
        }

        $allocation = EquipmentAllocation::create([
            'equipment_id' => $request->equipment_id,
            'project_id' => $projectId,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'daily_rate' => $request->daily_rate,
            'allocated_to' => $request->allocated_to,
            'notes' => $request->notes,
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        // Cập nhật status của equipment nếu cần
        if ($equipment->status === 'available') {
            $equipment->update(['status' => 'in_use']);
        }

        $allocation->load(['equipment', 'project', 'allocatedTo', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo phân bổ thiết bị thành công.',
            'data' => $allocation
        ], 201);
    }
}
