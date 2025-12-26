<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CostController extends Controller
{
    /**
     * Danh sách chi phí
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments']);

        // Filter theo category
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // Filter theo status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $costs = $query->orderByDesc('cost_date')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $costs,
        ]);
    }

    /**
     * Tạo chi phí mới (Quản lý dự án)
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$user->hasPermission('costs.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo chi phí.'
            ], 403);
        }

        $validated = $request->validate([
            'category' => [
                'required',
                Rule::in([
                    'construction_materials',
                    'concrete',
                    'labor',
                    'equipment',
                    'transportation',
                    'other'
                ]),
            ],
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'cost_date' => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            $cost = Cost::create([
                'project_id' => $project->id,
                'created_by' => $user->id,
                ...$validated,
                'status' => 'draft', // Mặc định là draft
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được tạo.',
                'data' => $cost->load(['creator']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật chi phí (chỉ khi draft)
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);

        // Chỉ cho phép cập nhật khi ở trạng thái draft
        if ($cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể cập nhật chi phí ở trạng thái nháp.',
            ], 400);
        }

        $validated = $request->validate([
            'category' => [
                'sometimes',
                Rule::in([
                    'construction_materials',
                    'concrete',
                    'labor',
                    'equipment',
                    'transportation',
                    'other'
                ]),
            ],
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'cost_date' => 'sometimes|date',
        ]);

        $cost->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được cập nhật.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Submit để Ban điều hành duyệt
     */
    public function submit(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);

        if ($cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể submit chi phí ở trạng thái nháp.',
            ], 400);
        }

        $cost->submitForManagementApproval();

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được gửi để Ban điều hành duyệt.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Ban điều hành duyệt
     */
    public function approveByManagement(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Check permission
        if (!$user->hasPermission('costs.approve_management')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).'
            ], 403);
        }

        if ($cost->status !== 'pending_management_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ Ban điều hành duyệt.',
            ], 400);
        }

        $cost->approveByManagement($user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được Ban điều hành duyệt.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Kế toán xác nhận (final approval)
     */
    public function approveByAccountant(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Check permission
        if (!$user->hasPermission('costs.approve_accountant')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).'
            ], 403);
        }

        if ($cost->status !== 'pending_accountant_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ Kế toán xác nhận.',
            ], 400);
        }

        $cost->approveByAccountant($user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được Kế toán xác nhận.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Từ chối chi phí
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối chi phí đang chờ duyệt.',
            ], 400);
        }

        $cost->reject($validated['rejected_reason'], $user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã bị từ chối.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Xóa chi phí (chỉ khi draft)
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);

        if ($cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa chi phí ở trạng thái nháp.',
            ], 400);
        }

        $cost->delete();

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được xóa.',
        ]);
    }
}
