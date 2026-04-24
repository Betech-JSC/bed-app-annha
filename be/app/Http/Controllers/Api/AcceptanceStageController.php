<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceStage;
use App\Models\Project;
use App\Models\Attachment;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcceptanceStageController extends Controller
{
    protected $notificationService;
    protected $authService;
    protected $acceptanceService;

    public function __construct(
        NotificationService $notificationService, 
        \App\Services\AuthorizationService $authService,
        \App\Services\AcceptanceService $acceptanceService
    ) {
        $this->notificationService = $notificationService;
        $this->authService = $authService;
        $this->acceptanceService = $acceptanceService;
    }

    /**
     * Danh sách giai đoạn nghiệm thu
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::ACCEPTANCE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem giai đoạn nghiệm thu của dự án này.'
            ], 403);
        }
        $stages = $this->acceptanceService->getStagesForProject($project);

        return response()->json([
            'success' => true,
            'data' => $stages
        ]);
    }

    /**
     * Supervisor approve (Giám sát duyệt giai đoạn)
     * Workflow: pending → supervisor_approved
     */
    public function supervisorApprove(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$this->authService->can($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nghiệm thu (Cấp 1 - Giám sát).'
            ], 403);
        }

        try {
            $this->acceptanceService->approveStage($stage, $user, 1);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt thành công.',
                'data' => $stage->fresh(['supervisorApprover'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Project Manager approve (Quản lý dự án duyệt giai đoạn)
     * Workflow: supervisor_approved → project_manager_approved
     */
    public function projectManagerApprove(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$this->authService->can($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nghiệm thu (Cấp 2 - Quản lý dự án).'
            ], 403);
        }

        try {
            $this->acceptanceService->approveStage($stage, $user, 2);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt thành công.',
                'data' => $stage->fresh(['projectManagerApprover'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Customer approve (Khách hàng duyệt giai đoạn)
     * Workflow: project_manager_approved → customer_approved
     */
    public function customerApprove(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$this->authService->can($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nghiệm thu (Cấp 3 - Khách hàng).'
            ], 403);
        }

        try {
            $this->acceptanceService->approveStage($stage, $user, 3);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt nghiệm thu thành công.',
                'data' => $stage->fresh(['customerApprover'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Duyệt giai đoạn nghiệm thu (Legacy method - for backward compatibility)
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'approval_type' => ['required', 'in:internal,customer,design,owner,supervisor,project_manager'],
        ]);

        try {
            $success = $this->acceptanceService->approveStageLegacy($stage, $validated['approval_type'], $user);

            if (!$success) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể duyệt giai đoạn này. Vui lòng kiểm tra trạng thái và quyền truy cập.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Giai đoạn nghiệm thu đã được duyệt.',
                'data' => $stage->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Attach files to acceptance stage (upload hình ảnh nghiệm thu)
     */
    public function attachFiles(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $attached = $this->acceptanceService->attachFiles($stage, $validated['attachment_ids'], $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã đính kèm ' . count($attached) . ' file.',
                'data' => $stage->fresh(['attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi đính kèm file.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết giai đoạn nghiệm thu
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)
            ->with([
                'internalApprover',
                'supervisorApprover',
                'projectManagerApprover',
                'customerApprover',
                'designApprover',
                'ownerApprover',
                'task', // BUSINESS RULE: Link to parent task (A) - parent task acts as "phase"
                'acceptanceTemplate', // Link to acceptance template from Settings
                'defects',
                'attachments'
            ])
            ->findOrFail($id);

        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::ACCEPTANCE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi tiết giai đoạn nghiệm thu này.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $stage
        ]);
    }

    /**
     * Tạo giai đoạn nghiệm thu mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();

        // 1. Permission check
        if (!$user->hasPermission(\App\Constants\Permissions::ACCEPTANCE_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo giai đoạn nghiệm thu.'
            ], 403);
        }

        // 2. Validate request
        $validated = $request->validate([
            'task_id' => 'required|exists:project_tasks,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        // 3. Business Rules Check
        if ($project->status === 'closed' || $project->status === 'cancelled') {
            return response()->json(['success' => false, 'message' => 'Dự án đã đóng hoặc bị hủy, không thể tạo nghiệm thu.'], 422);
        }

        $task = $project->tasks()->find($validated['task_id']);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Công việc không thuộc dự án này.'], 422);
        }

        if ($task->parent_id !== null) {
            return response()->json(['success' => false, 'message' => 'Chỉ có thể chọn công việc cha (Category A) cho Giai đoạn nghiệm thu.'], 422);
        }

        // 4. Uniqueness Check: One stage per Task A
        $existing = AcceptanceStage::where('task_id', $task->id)->exists();
        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Công việc này đã có Giai đoạn nghiệm thu rồi.'], 422);
        }

        try {
            if (!isset($validated['order'])) {
                $maxOrder = $project->acceptanceStages()->max('order') ?? 0;
                $validated['order'] = $maxOrder + 1;
            }

            $stage = $this->acceptanceService->upsertStage(array_merge($validated, [
                'project_id' => $project->id,
                'is_custom' => true,
            ]), null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo giai đoạn nghiệm thu mới.',
                'data' => $stage->load(['attachments'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật giai đoạn nghiệm thu
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check permission
        if (!$user->hasPermission(\App\Constants\Permissions::ACCEPTANCE_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật giai đoạn nghiệm thu này.'
            ], 403);
        }

        // Không cho phép chỉnh sửa nếu đã được duyệt hoàn toàn
        if ($stage->status === 'owner_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể chỉnh sửa giai đoạn đã được duyệt hoàn toàn.'
            ], 400);
        }

        $validated = $request->validate([
            'task_id' => 'sometimes|exists:project_tasks,id', // BUSINESS RULE: Must be parent task (A)
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'order' => 'sometimes|integer|min:0',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id', // Link to template from Settings
        ]);

        // BUSINESS RULE: If task_id is provided, verify it's a parent task
        if (isset($validated['task_id'])) {
            $task = $project->tasks()->find($validated['task_id']);
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Công việc không tồn tại trong dự án này.'
                ], 404);
            }

            if ($task->parent_id !== null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể chọn công việc cha (Category A). Không thể chọn công việc con (A\', A\'\').'
                ], 422);
            }
        }

        try {
            $this->acceptanceService->upsertStage($validated, $stage, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật giai đoạn nghiệm thu.',
                'data' => $stage->fresh(['attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Xóa giai đoạn nghiệm thu
     */
    public function destroy(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check permission
        if (!$user->hasPermission(\App\Constants\Permissions::ACCEPTANCE_DELETE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa giai đoạn nghiệm thu này.'
            ], 403);
        }

        try {
            $this->acceptanceService->deleteStage($stage);
            return response()->json([
                'success' => true,
                'message' => 'Đã xóa giai đoạn nghiệm thu.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
