<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
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

        $query = Project::with([
            'customer',
            'projectManager',
            'contract',
            'progress',
        ]);

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
     * Tạo dự án mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:projects,code',
            'description' => 'nullable|string',
            'customer_id' => 'required|exists:users,id',
            'project_manager_id' => 'nullable|exists:users,id',
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

        // Only customer can delete
        if ($project->customer_id !== auth()->id()) {
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
