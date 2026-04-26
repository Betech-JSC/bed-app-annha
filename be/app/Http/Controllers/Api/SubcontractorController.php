<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\GlobalSubcontractor;
use App\Models\Cost;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorController extends Controller
{
    protected $authService;
    protected $subcontractorService;

    public function __construct(\App\Services\AuthorizationService $authService, \App\Services\SubcontractorService $subcontractorService)
    {
        $this->authService = $authService;
        $this->subcontractorService = $subcontractorService;
    }
    /**
     * Danh sách nhà thầu phụ
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem nhà thầu phụ của dự án này.'
            ], 403);
        }

        $subcontractors = $project->subcontractors()
            ->with(['approver', 'attachments', 'items', 'payments' => function ($q) {
                $q->orderByDesc('created_at');
            }])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subcontractors
        ]);
    }

    /**
     * Chi tiết nhà thầu phụ
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi tiết nhà thầu phụ này.'
            ], 403);
        }

        $subcontractor = Subcontractor::where('project_id', $projectId)
            ->with(['approver', 'attachments', 'items', 'payments', 'project'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subcontractor
        ]);
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhà thầu phụ của dự án này.'
            ], 403);
        }

        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);
        
        try {
            $this->subcontractorService->delete($subcontractor);
            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được xóa.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nhà thầu phụ của dự án này.'
            ], 403);
        }

        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->subcontractorService->approve($subcontractor, $user);
            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được duyệt.',
                'data' => $subcontractor->fresh(['approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thêm nhà thầu phụ cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'name' => 'required_without:global_subcontractor_id|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['nullable', 'in:not_started,in_progress,completed,delayed'],
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
            'payment_schedule' => 'nullable|array',
        ]);

        try {
            // Nếu có global_subcontractor_id, lấy thông tin từ global subcontractor
            if (isset($validated['global_subcontractor_id'])) {
                $globalSubcontractor = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
                $validated['name'] = $globalSubcontractor->name;
                $validated['category'] = $globalSubcontractor->category ?? $validated['category'] ?? null;
                $validated['bank_name'] = $globalSubcontractor->bank_name ?? $validated['bank_name'] ?? null;
                $validated['bank_account_number'] = $globalSubcontractor->bank_account_number ?? $validated['bank_account_number'] ?? null;
                $validated['bank_account_name'] = $globalSubcontractor->bank_account_name ?? $validated['bank_account_name'] ?? null;
            }

            $subcontractor = $this->subcontractorService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            // Link attachments if provided
            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_type' => Subcontractor::class,
                        'attachable_id' => $subcontractor->id,
                    ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được thêm.',
                'data' => $subcontractor
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::SUBCONTRACTOR_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật nhà thầu phụ của dự án này.'
            ], 403);
        }

        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'sometimes|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['sometimes', 'in:not_started,in_progress,completed,delayed'],
            'payment_schedule' => 'nullable|array',
        ]);

        try {
            $this->subcontractorService->upsert($validated, $subcontractor, $user);

            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được cập nhật.',
                'data' => $subcontractor->fresh(['items', 'payments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }
}
