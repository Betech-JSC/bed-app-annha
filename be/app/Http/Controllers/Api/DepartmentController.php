<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem danh sách phòng ban.'
            ], 403);
        }

        $query = Department::with(['parent', 'manager', 'employees']);

        if ($request->query('active_only') === 'true') {
            $query->where('status', 'active');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->query('parent_id')) {
            $query->where('parent_id', $request->query('parent_id'));
        }

        $departments = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $departments
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo phòng ban.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $department = Department::create([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'parent_id' => $request->parent_id,
            'manager_id' => $request->manager_id,
            'status' => $request->status ?? 'active',
        ]);

        $department->load(['parent', 'manager']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo phòng ban thành công.',
            'data' => $department
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem phòng ban.'
            ], 403);
        }

        $department = Department::with(['parent', 'manager', 'children', 'employees'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $department
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật phòng ban.'
            ], 403);
        }

        $department = Department::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50|unique:departments,code,' . $id,
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $department->update($request->only([
            'name', 'code', 'description', 'parent_id', 'manager_id', 'status'
        ]));

        $department->load(['parent', 'manager']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật phòng ban thành công.',
            'data' => $department
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa phòng ban.'
            ], 403);
        }

        $department = Department::findOrFail($id);

        // Kiểm tra có phòng ban con không
        if ($department->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa phòng ban có phòng ban con.'
            ], 422);
        }

        // Kiểm tra có nhân viên không
        if ($department->employees()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa phòng ban có nhân viên.'
            ], 422);
        }

        $department->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phòng ban thành công.'
        ]);
    }
}
