<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    /**
     * Danh sách dự án
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;

        $query = Project::with([
            'customer',
            'projectManager',
            'contract',
            'progress',
        ]);

        // Super admin có thể xem tất cả projects
        if (!$isSuperAdmin) {
            // Filter: Customer sees their projects, personnel sees assigned projects
            if ($request->has('my_projects') && $request->my_projects) {
                $query->where(function ($q) use ($user) {
                    $q->where('customer_id', $user->id)
                        ->orWhere('project_manager_id', $user->id)
                        ->orWhereHas('personnel', function ($q) use ($user) {
                            $q->where('user_id', $user->id);
                        });
                });
            } else {
                // Admin or project manager can see all
                $query->where('customer_id', $user->id)
                    ->orWhere('project_manager_id', $user->id)
                    ->orWhereHas('personnel', function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                    });
            }
        }

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $projects = $query->orderByDesc('created_at')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $projects
        ]);
    }

    /**
     * Lấy danh sách customers
     * Ưu tiên: users có role = 'customer' hoặc có role "Khách hàng" trong bảng roles
     * Nếu không có, lấy tất cả users (trừ admin và nhân sự nội bộ)
     */
    public function getCustomers(Request $request)
    {
        // Search
        $search = $request->query('search');

        // Thử lấy users có role = 'customer' hoặc có role "Khách hàng" trong bảng roles
        $customerQuery = User::whereNull('deleted_at')
            ->where(function ($q) {
                $q->where('role', 'customer')
                    ->orWhereHas('roles', function ($roleQuery) {
                        $roleQuery->where(function ($rq) {
                            $rq->where('name', 'like', '%khách hàng%')
                                ->orWhere('name', 'like', '%customer%')
                                ->orWhere('name', 'like', '%Khách hàng%');
                        });
                    });
            });

        // Apply search nếu có
        if ($search) {
            $customerQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $customerQuery->orderBy('name')->get([
            'id',
            'name',
            'email',
            'phone',
        ]);

        // Nếu không có customers theo điều kiện trên, lấy tất cả users (trừ admin và nhân sự nội bộ)
        if ($customers->isEmpty()) {
            $fallbackQuery = User::whereNull('deleted_at')
                ->where('role', '!=', 'admin')
                ->whereDoesntHave('employeeProfile'); // Không phải nhân sự nội bộ

            // Apply search nếu có
            if ($search) {
                $fallbackQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            $customers = $fallbackQuery->orderBy('name')->get([
                'id',
                'name',
                'email',
                'phone',
            ]);

            // Nếu vẫn không có, lấy tất cả users (trừ admin) - fallback cuối cùng
            if ($customers->isEmpty()) {
                $finalQuery = User::whereNull('deleted_at')
                    ->where('role', '!=', 'admin');

                // Apply search nếu có
                if ($search) {
                    $finalQuery->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                }

                $customers = $finalQuery->orderBy('name')->get([
                    'id',
                    'name',
                    'email',
                    'phone',
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $customers,
        ]);
    }

    /**
     * Lấy danh sách project managers
     * Ưu tiên: admin, users có role quản lý, hoặc users nội bộ (có employeeProfile)
     * Nếu không có, lấy tất cả users (trừ customer và subcontractor)
     */
    public function getProjectManagers(Request $request)
    {
        $query = User::whereNull('deleted_at');

        // Ưu tiên: admin, users có role quản lý, hoặc users nội bộ
        $managerQuery = clone $query;
        $managerQuery->where(function ($q) {
            $q->where('role', 'admin')
                ->orWhereHas('roles', function ($roleQuery) {
                    $roleQuery->where(function ($rq) {
                        $rq->where('name', 'like', '%quản lý%')
                            ->orWhere('name', 'like', '%manager%')
                            ->orWhere('name', 'like', '%Quản lý%')
                            ->orWhere('name', 'like', '%Ban điều hành%')
                            ->orWhere('name', 'like', '%Management%');
                    });
                })
                ->orWhereHas('employeeProfile');
        });

        $managers = $managerQuery->get();

        // Nếu không có managers theo điều kiện trên, lấy tất cả users (trừ customer và subcontractor)
        if ($managers->isEmpty()) {
            $query->where('role', '!=', 'customer')
                ->where('role', '!=', 'subcontractor');
        } else {
            $query = $managerQuery;
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $managers = $query->orderBy('name')->get([
            'id',
            'name',
            'email',
            'phone',
            'role',
        ]);

        return response()->json([
            'success' => true,
            'data' => $managers,
        ]);
    }

    /**
     * Lấy toàn bộ danh sách users hệ thống (cho form tạo/sửa dự án)
     */
    public function getAllUsers(Request $request)
    {
        $query = User::whereNull('deleted_at');

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->get([
            'id',
            'name',
            'email',
            'phone',
            'role',
        ]);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Tạo dự án mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // Check permission (super admin bypass)
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('projects.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo dự án mới.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:projects,code',
            'description' => 'nullable|string',
            'customer_id' => 'required|integer|min:1|exists:users,id',
            'project_manager_id' => 'nullable|integer|min:1|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['nullable', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        try {
            DB::beginTransaction();

            $project = Project::create([
                ...$validated,
                'created_by' => $user->id,
                'status' => $validated['status'] ?? 'planning',
            ]);

            // Create initial progress record
            $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'manual',
            ]);

            // Auto-assign creator as project manager if not specified
            if (!$project->project_manager_id) {
                $project->update(['project_manager_id' => $user->id]);
            }

            // Add creator to personnel if not customer
            if ($project->customer_id !== $user->id) {
                $project->personnel()->create([
                    'user_id' => $user->id,
                    'role' => 'project_manager',
                    'assigned_by' => $user->id,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dự án đã được tạo thành công.',
                'data' => $project->load(['customer', 'projectManager', 'progress'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo dự án.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết dự án
     */
    public function show(string $id)
    {
        $project = Project::with([
            'customer',
            'projectManager',
            'contract',
            'payments',
            'additionalCosts',
            'personnel.user',
            'subcontractors',
            'constructionLogs' => function ($q) {
                $q->latest('log_date')->limit(10);
            },
            'acceptanceStages',
            'defects' => function ($q) {
                $q->whereIn('status', ['open', 'in_progress']);
            },
            'progress',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $project
        ]);
    }

    /**
     * Cập nhật dự án
     */
    public function update(Request $request, string $id)
    {
        $project = Project::findOrFail($id);
        $user = auth()->user();

        // Check permission (super admin bypass)
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('projects.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('projects', 'code')->ignore($project->id)],
            'description' => 'nullable|string',
            'project_manager_id' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['sometimes', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        $project->update([
            ...$validated,
            'updated_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dự án đã được cập nhật.',
            'data' => $project->fresh()
        ]);
    }

    /**
     * Xóa dự án
     */
    public function destroy(string $id)
    {
        $project = Project::findOrFail($id);
        $user = auth()->user();

        // Check permission (super admin bypass)
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('projects.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa dự án này.'
            ], 403);
        }

        // Only customer can delete (super admin bypass)
        if (!$isSuperAdmin && $project->customer_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ chủ dự án mới có quyền xóa.'
            ], 403);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Dự án đã được xóa.'
        ]);
    }
}
