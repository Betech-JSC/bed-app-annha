<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Defect;
use App\Models\DefectHistory;
use App\Models\Project;
use App\Models\Attachment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DefectController extends Controller
{
    use ApiAuthorization;

    protected $defectService;
    protected $attachmentService;

    public function __construct(
        \App\Services\DefectService $defectService,
        \App\Services\AttachmentService $attachmentService
    ) {
        $this->defectService = $defectService;
        $this->attachmentService = $attachmentService;
    }
    /**
     * Danh sách lỗi
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::DEFECT_VIEW, $project);

        $defects = $this->defectService->getDefects($project, $request->only(['status', 'severity']));

        return response()->json([
            'success' => true,
            'data' => $defects
        ]);
    }

    /**
     * Tạo lỗi mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::DEFECT_CREATE, $project);

        $validated = $request->validate([
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_stage_id' => 'nullable|exists:acceptance_stages,id',
            'description' => 'required|string|max:2000',
            'severity' => ['required', 'in:low,medium,high,critical'],
            'before_image_ids' => 'nullable|array',
            'before_image_ids.*' => 'required|integer|exists:attachments,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'defect_type' => 'nullable|in:standard_violation,other',
            'violated_criteria_ids' => 'nullable|array',
            'violated_criteria_ids.*' => 'required|integer|exists:acceptance_criteria,id',
        ]);

        try {
            DB::beginTransaction();

            $data = array_merge($validated, ['project_id' => $project->id]);
            $defect = $this->defectService->upsertDefect($data, null, $user);

            // Attach before images
            if (!empty($validated['before_image_ids'])) {
                $this->attachmentService->linkExistingAttachments($validated['before_image_ids'], $defect, 'before');
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lỗi đã được ghi nhận.',
                'data' => $defect->load(['reporter', 'acceptanceStage', 'attachments', 'violatedCriteria'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

      public function update(Request $request, string $projectId, string $id)
    {
        $this->apiRequire($request->user(), Permissions::DEFECT_UPDATE, $projectId);

        $defect = Defect::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'description' => 'sometimes|string|max:2000',
            'severity' => ['sometimes', 'in:low,medium,high,critical'],
            'status' => ['sometimes', 'in:open,in_progress,fixed,verified'],
            'expected_completion_date' => 'nullable|date',
            'after_image_ids' => 'nullable|array',
            'after_image_ids.*' => 'required|integer|exists:attachments,id',
            'violated_criteria_ids' => 'nullable|array',
            'violated_criteria_ids.*' => 'required|integer|exists:acceptance_criteria,id',
            'rejection_reason' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $status = $validated['status'] ?? null;
            if ($status) {
                // Special handling for 'fixed' to require images
                if ($status === 'fixed' && empty($validated['after_image_ids'])) {
                    return response()->json(['success' => false, 'message' => 'Vui lòng upload hình ảnh đã sửa.'], 422);
                }

                $this->defectService->transitionStatus($defect, $status, $user, $validated);

                if ($status === 'fixed' && !empty($validated['after_image_ids'])) {
                    $this->attachmentService->linkExistingAttachments($validated['after_image_ids'], $defect, 'after');
                }
            }

            // Normal update for other fields
            $this->defectService->upsertDefect(array_merge($validated, ['project_id' => $projectId]), $defect, $user);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lỗi đã được cập nhật.',
                'data' => $defect->fresh(['reporter', 'fixer', 'verifier', 'task', 'acceptanceStage', 'attachments', 'violatedCriteria'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Chi tiết lỗi với lịch sử
     */
    public function show(string $projectId, string $id)
    {
        $this->apiRequire(auth()->user(), Permissions::DEFECT_VIEW, $projectId);

        $defect = Defect::where('project_id', $projectId)
            ->with([
                'reporter',
                'fixer',
                'verifier',
                'task',
                'acceptanceStage',
                'attachments' => function ($q) {
                    $q->orderBy('created_at');
                },
                'histories' => function ($q) {
                    $q->orderByDesc('created_at');
                },
                'histories.user'
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $defect
        ]);
    }

    /**
     * Xác nhận tiêu chí nghiệm thu (Verify Criteria)
     */
    public function verifyCriteria(Request $request, string $projectId, string $id)
    {
        $this->apiRequire($request->user(), Permissions::DEFECT_VERIFY, $projectId);

        $defect = Defect::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'criteria' => 'required|array',
            'criteria.*.id' => 'required|exists:acceptance_criteria,id',
            'criteria.*.status' => 'required|in:passed,failed',
        ]);

        try {
            DB::beginTransaction();
            $this->defectService->verifyCriteria($defect, $validated['criteria'], $user);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật trạng thái tiêu chí.',
                'data' => $defect->fresh(['violatedCriteria'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }
}
