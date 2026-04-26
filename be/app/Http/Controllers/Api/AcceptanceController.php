<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Acceptance;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\AcceptanceService;
use App\Services\AuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcceptanceController extends Controller
{
    public function __construct(
        protected AcceptanceService $acceptanceService,
        protected \App\Services\AuthorizationService $authService
    ) {}

    /**
     * List all acceptances for a project, with eager loads.
     * Client groups by parent_task_id in the UI.
     */
    public function index(string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user    = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_VIEW, $project)) {
            return $this->forbidden('Bạn không có quyền xem nghiệm thu của dự án này.');
        }

        $acceptances = $this->acceptanceService->getForProject($project);

        return response()->json(['success' => true, 'data' => $acceptances]);
    }

    /**
     * Show a single acceptance record.
     */
    public function show(string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)
            ->with(['task.parent', 'template.criteria', 'submitter', 'supervisorApprover', 'customerApprover', 'rejector', 'attachments', 'defects'])
            ->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_VIEW, $project)) {
            return $this->forbidden('Bạn không có quyền xem nghiệm thu này.');
        }

        return response()->json(['success' => true, 'data' => $acceptance]);
    }

    /**
     * Manually create an acceptance record for a child task.
     */
    public function store(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user    = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_CREATE, $project)) {
            return $this->forbidden('Bạn không có quyền tạo nghiệm thu.');
        }

        // Cast string "null" from FormData to actual null
        foreach (['description', 'acceptance_template_id'] as $field) {
            if ($request->input($field) === 'null') {
                $request->merge([$field => null]);
            }
        }

        $validated = $request->validate([
            'task_id'                => 'required|exists:project_tasks,id',
            'name'                   => 'sometimes|string|max:255',
            'description'            => 'nullable|string',
            'order'                  => 'nullable|integer|min:0',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
        ]);

        $task = $project->tasks()->findOrFail($validated['task_id']);

        if (!$task->parent_id) {
            return response()->json(['success' => false, 'message' => 'Chỉ có thể tạo nghiệm thu cho hạng mục con (có task cha).'], 422);
        }

        if (Acceptance::where('task_id', $task->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Hạng mục này đã có phiếu nghiệm thu.'], 422);
        }

        $acceptance = Acceptance::create([
            'project_id'      => $project->id,
            'task_id'         => $task->id,
            'name'            => $validated['name'] ?? $task->name,
            'description'     => $validated['description'] ?? null,
            'order'           => $validated['order'] ?? ((int) Acceptance::where('project_id', $project->id)->max('order') + 1),
            'workflow_status' => 'draft',
            'created_by'      => $user->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Đã tạo phiếu nghiệm thu.', 'data' => $acceptance->load(['task'])], 201);
    }

    /**
     * Update name/description of an acceptance (only draft/rejected).
     */
    public function update(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return $this->forbidden('Bạn không có quyền cập nhật nghiệm thu.');
        }

        if ($acceptance->workflow_status === 'customer_approved') {
            return response()->json(['success' => false, 'message' => 'Không thể chỉnh sửa nghiệm thu đã hoàn tất.'], 400);
        }

        // Cast string "null" from FormData to actual null
        foreach (['description', 'notes', 'acceptance_template_id'] as $field) {
            if ($request->input($field) === 'null') {
                $request->merge([$field => null]);
            }
        }

        $validated = $request->validate([
            'name'                   => 'sometimes|string|max:255',
            'description'            => 'nullable|string',
            'notes'                  => 'nullable|string',
            'order'                  => 'nullable|integer|min:0',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
        ]);

        $acceptance->fill(array_merge($validated, ['updated_by' => $user->id]))->save();

        return response()->json(['success' => true, 'message' => 'Đã cập nhật nghiệm thu.', 'data' => $acceptance->fresh(['task'])]);
    }

    /**
     * Soft-delete an acceptance (only draft/rejected).
     */
    public function destroy(string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_DELETE, $project)) {
            return $this->forbidden('Bạn không có quyền xóa nghiệm thu.');
        }

        if (!in_array($acceptance->workflow_status, ['draft', 'rejected'])) {
            return response()->json(['success' => false, 'message' => 'Chỉ xóa được nghiệm thu ở trạng thái nháp hoặc bị từ chối.'], 400);
        }

        $acceptance->delete();

        return response()->json(['success' => true, 'message' => 'Đã xóa phiếu nghiệm thu.']);
    }

    /**
     * Supervisor approves: submitted → supervisor_approved
     */
    public function supervisorApprove(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return $this->forbidden('Bạn không có quyền duyệt nghiệm thu (Cấp 1 - Giám sát).');
        }

        try {
            $this->acceptanceService->approve($acceptance, $user, 1);
            return response()->json(['success' => true, 'message' => 'Giám sát đã xác nhận nghiệm thu.', 'data' => $acceptance->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Customer approves: supervisor_approved → customer_approved
     */
    public function customerApprove(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) {
            return $this->forbidden('Bạn không có quyền duyệt nghiệm thu (Cấp 3 - Khách hàng).');
        }

        try {
            $this->acceptanceService->approve($acceptance, $user, 3);
            return response()->json(['success' => true, 'message' => 'Đã duyệt nghiệm thu thành công.', 'data' => $acceptance->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject an acceptance record.
     */
    public function reject(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        $request->validate(['reason' => 'required|string|max:500']);

        $canReject = $this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)
                  || $this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project);

        if (!$canReject) {
            return $this->forbidden('Bạn không có quyền từ chối nghiệm thu.');
        }

        try {
            $this->acceptanceService->reject($acceptance, $user, $request->reason);
            return response()->json(['success' => true, 'message' => 'Đã từ chối nghiệm thu.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Revert an acceptance to draft.
     */
    public function revert(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_REVERT, $project)) {
            return $this->forbidden('Bạn không có quyền hoàn duyệt nghiệm thu.');
        }

        try {
            $this->acceptanceService->revertToDraft($acceptance, $user);
            return response()->json(['success' => true, 'message' => 'Đã hoàn duyệt về nháp.', 'data' => $acceptance->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Submit an acceptance record (draft → submitted).
     */
    public function submit(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        // Staff can submit if they have update permission or created it
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return $this->forbidden('Bạn không có quyền gửi duyệt.');
        }

        try {
            $this->acceptanceService->submit($acceptance, $user);
            return response()->json(['success' => true, 'message' => 'Đã gửi duyệt nghiệm thu thành công.', 'data' => $acceptance->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Attach uploaded files to an acceptance record.
     */
    public function attachFiles(Request $request, string $projectId, string $id): JsonResponse
    {
        $project    = Project::findOrFail($projectId);
        $acceptance = Acceptance::where('project_id', $project->id)->findOrFail($id);
        $user       = $request->user();

        $validated = $request->validate([
            'attachment_ids'   => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        $attached = $this->acceptanceService->attachFiles($acceptance, $validated['attachment_ids'], $user);

        return response()->json(['success' => true, 'message' => 'Đã đính kèm ' . count($attached) . ' file.', 'data' => $acceptance->fresh(['attachments'])]);
    }

    /**
     * Batch approve at supervisor level (level 1) for all children of a parent task.
     */
    public function batchSupervisorApprove(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user    = $request->user();

        $request->validate(['parent_task_id' => 'required|integer|exists:project_tasks,id']);

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return $this->forbidden('Bạn không có quyền duyệt nghiệm thu (Giám sát).');
        }

        $parent = ProjectTask::findOrFail($request->parent_task_id);
        $count  = $this->acceptanceService->batchApprove($parent, $user, 1);

        return response()->json(['success' => true, 'message' => "Đã duyệt {$count} hạng mục (Giám sát)."]);
    }

    /**
     * Batch approve at customer level (level 3) for all children of a parent task.
     */
    public function batchCustomerApprove(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $user    = $request->user();

        $request->validate(['parent_task_id' => 'required|integer|exists:project_tasks,id']);

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) {
            return $this->forbidden('Bạn không có quyền duyệt nghiệm thu (Khách hàng).');
        }

        $parent = ProjectTask::findOrFail($request->parent_task_id);
        $count  = $this->acceptanceService->batchApprove($parent, $user, 3);

        return response()->json(['success' => true, 'message' => "Đã duyệt {$count} hạng mục (Khách hàng)."]);
    }

    // ==================================================================
    // DEPRECATED stubs — old stage/item routes now return 410
    // ==================================================================

    public function deprecated(): JsonResponse
    {
        return response()->json(['success' => false, 'message' => 'Endpoint này đã bị bãi bỏ. Sử dụng /acceptances thay thế.'], 410);
    }

    // ==================================================================
    // PRIVATE HELPERS
    // ==================================================================

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 403);
    }
}
