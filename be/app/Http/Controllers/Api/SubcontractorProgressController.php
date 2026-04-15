<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorProgress;
use App\Models\Subcontractor;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubcontractorProgressController extends Controller
{
    protected $subcontractorService;
    protected $authService;

    public function __construct(\App\Services\SubcontractorService $subcontractorService, \App\Services\AuthorizationService $authService)
    {
        $this->subcontractorService = $subcontractorService;
        $this->authService = $authService;
    }

    /**
     * Danh sách tiến độ thi công
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        // Check view permission if project_id is provided, otherwise generic check
        if ($projectId = $request->query('project_id')) {
            $project = Project::findOrFail($projectId);
            if (!$this->authService->can($user, 'subcontractors.view', $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem tiến độ.'], 403);
            }
        } elseif (!$user->hasPermission('subcontractors.view')) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem tiến độ thi công.'], 403);
        }

        $progress = $this->subcontractorService->getProgress($request->all());

        return response()->json([
            'success' => true,
            'data' => $progress
        ]);
    }

    /**
     * Tạo báo cáo tiến độ mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        $project = Project::findOrFail($request->project_id);

        if (!$this->authService->can($user, 'subcontractors.create', $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền tạo báo cáo tiến độ.'], 403);
        }

        $validated = $request->validate([
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'project_id' => 'required|exists:projects,id',
            'subcontractor_contract_id' => 'nullable|exists:subcontractor_contracts,id',
            'progress_date' => 'required|date',
            'planned_progress' => 'required|numeric|min:0|max:100',
            'actual_progress' => 'required|numeric|min:0|max:100',
            'completed_volume' => 'required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'work_description' => 'nullable|string',
            'next_week_plan' => 'nullable|string',
            'issues_and_risks' => 'nullable|string',
            'status' => 'nullable|in:on_schedule,delayed,ahead_of_schedule,at_risk',
        ]);

        try {
            $progress = $this->subcontractorService->upsertProgress($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo báo cáo tiến độ thành công.',
                'data' => $progress
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Chi tiết tiến độ
     */
    public function show(string $id)
    {
        $progress = SubcontractorProgress::with([
            'subcontractor', 'project', 'contract', 'reporter', 'verifier', 'attachments'
        ])->findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.view', $progress->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem tiến độ.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $progress
        ]);
    }

    /**
     * Cập nhật tiến độ
     */
    public function update(Request $request, string $id)
    {
        $progress = SubcontractorProgress::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.update', $progress->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền cập nhật tiến độ.'], 403);
        }

        $validated = $request->validate([
            'progress_date' => 'sometimes|required|date',
            'planned_progress' => 'sometimes|required|numeric|min:0|max:100',
            'actual_progress' => 'sometimes|required|numeric|min:0|max:100',
            'completed_volume' => 'sometimes|required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'work_description' => 'nullable|string',
            'next_week_plan' => 'nullable|string',
            'issues_and_risks' => 'nullable|string',
            'status' => 'sometimes|nullable|in:on_schedule,delayed,ahead_of_schedule,at_risk',
        ]);

        try {
            $progress = $this->subcontractorService->upsertProgress($validated, $progress, auth()->user());

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật tiến độ thành công.',
                'data' => $progress
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Xóa tiến độ
     */
    public function destroy(string $id)
    {
        $progress = SubcontractorProgress::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.delete', $progress->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa tiến độ.'], 403);
        }

        if ($progress->verified_at) {
            return response()->json(['success' => false, 'message' => 'Không thể xóa báo cáo tiến độ đã được xác nhận.'], 422);
        }

        $progress->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa báo cáo tiến độ thành công.'
        ]);
    }

    /**
     * Xác nhận tiến độ
     */
    public function verify(Request $request, string $id)
    {
        $progress = SubcontractorProgress::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.approve', $progress->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xác nhận tiến độ.'], 403);
        }

        try {
            $this->subcontractorService->verifyProgress($progress, auth()->user());

            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận tiến độ thành công.',
                'data' => $progress->fresh(['verifier'])
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
