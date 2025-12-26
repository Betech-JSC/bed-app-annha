<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CostGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CostGroup::with('creator')->ordered();

        // Filter active
        if ($request->query('active_only') === 'true' || $request->query('active_only') === true) {
            $query->active();
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Nếu có active_only và không có search, trả về tất cả (không paginate) để dùng cho dropdown
        $activeOnly = $request->query('active_only');
        $hasSearch = $request->query('search');
        
        if (($activeOnly === true || $activeOnly === 'true' || $activeOnly === 1 || $activeOnly === '1') && !$hasSearch) {
            $costGroups = $query->get();
            return response()->json([
                'success' => true,
                'data' => $costGroups
            ]);
        }

        // Có search hoặc không có active_only thì paginate
        $costGroups = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $costGroups
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền settings.manage)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền thực hiện thao tác này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:cost_groups,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $costGroup = CostGroup::create([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'is_active' => $request->has('is_active') ? $request->is_active : true,
            'sort_order' => $request->sort_order ?? 0,
            'created_by' => $user->id,
        ]);

        $costGroup->load('creator');

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo nhóm chi phí thành công.',
            'data' => $costGroup
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $costGroup = CostGroup::with('creator')->find($id);

        if (!$costGroup) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy nhóm chi phí.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $costGroup
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        // Check permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền thực hiện thao tác này.'
            ], 403);
        }

        $costGroup = CostGroup::find($id);

        if (!$costGroup) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy nhóm chi phí.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:cost_groups,code,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $costGroup->update([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'is_active' => $request->has('is_active') ? $request->is_active : $costGroup->is_active,
            'sort_order' => $request->sort_order ?? $costGroup->sort_order,
        ]);

        $costGroup->load('creator');

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật nhóm chi phí thành công.',
            'data' => $costGroup
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        // Check permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền thực hiện thao tác này.'
            ], 403);
        }

        $costGroup = CostGroup::find($id);

        if (!$costGroup) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy nhóm chi phí.'
            ], 404);
        }

        // Kiểm tra xem có chi phí nào đang sử dụng nhóm này không
        if ($costGroup->costs()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa nhóm chi phí này vì đang có chi phí sử dụng.'
            ], 422);
        }

        $costGroup->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa nhóm chi phí thành công.'
        ]);
    }
}
