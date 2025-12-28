<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Payroll;
use App\Models\LeaveRequest;
use App\Models\TimeTracking;
use App\Models\Cost;
use App\Models\Project;
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

    /**
     * Lấy thống kê của phòng ban
     */
    public function statistics(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('departments.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thống kê phòng ban.'
            ], 403);
        }

        $department = Department::findOrFail($id);

        // Đếm số lượng nhân viên
        $employeeCount = $department->employees()->count();

        // Thống kê Payroll
        $payrollStats = [
            'total' => Payroll::whereIn('user_id', $department->employees()->pluck('id'))->count(),
            'approved' => Payroll::whereIn('user_id', $department->employees()->pluck('id'))
                ->where('status', 'approved')->count(),
            'total_amount' => Payroll::whereIn('user_id', $department->employees()->pluck('id'))
                ->where('status', 'approved')->sum('net_salary'),
        ];

        // Thống kê Leave Requests
        $leaveStats = [
            'total' => LeaveRequest::whereIn('user_id', $department->employees()->pluck('id'))->count(),
            'pending' => LeaveRequest::whereIn('user_id', $department->employees()->pluck('id'))
                ->where('status', 'pending')->count(),
            'approved' => LeaveRequest::whereIn('user_id', $department->employees()->pluck('id'))
                ->where('status', 'approved')->count(),
        ];

        // Thống kê Time Tracking
        $timeTrackingStats = [
            'total' => TimeTracking::whereIn('user_id', $department->employees()->pluck('id'))->count(),
            'total_hours' => TimeTracking::whereIn('user_id', $department->employees()->pluck('id'))
                ->where('status', 'approved')->sum('total_hours'),
        ];

        // Thống kê Costs
        $costStats = [
            'total' => Cost::whereIn('created_by', $department->employees()->pluck('id'))->count(),
            'total_amount' => Cost::whereIn('created_by', $department->employees()->pluck('id'))
                ->where('status', 'approved')->sum('amount'),
        ];

        // Thống kê Projects
        $projectStats = [
            'total' => Project::whereIn('project_manager_id', $department->employees()->pluck('id'))->count(),
            'active' => Project::whereIn('project_manager_id', $department->employees()->pluck('id'))
                ->where('status', 'in_progress')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'department' => [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code,
                ],
                'statistics' => [
                    'employees' => $employeeCount,
                    'payroll' => $payrollStats,
                    'leave_requests' => $leaveStats,
                    'time_tracking' => $timeTrackingStats,
                    'costs' => $costStats,
                    'projects' => $projectStats,
                ],
            ],
        ]);
    }
}
