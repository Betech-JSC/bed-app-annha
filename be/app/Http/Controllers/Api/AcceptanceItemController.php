<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\Project;
use App\Models\Attachment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AcceptanceItemController extends Controller
{
    protected $authService;
    protected $acceptanceService;

    public function __construct(
        \App\Services\AuthorizationService $authService,
        \App\Services\AcceptanceService $acceptanceService
    ) {
        $this->authService = $authService;
        $this->acceptanceService = $acceptanceService;
    }
    /**
     * Danh sách hạng mục của giai đoạn nghiệm thu
     */
    public function index(string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hạng mục nghiệm thu của dự án này.'
            ], 403);
        }

        $items = $this->acceptanceService->getStageItems($stage);

        return response()->json([
            'success' => true,
            'data' => $items
        ]);
    }

    /**
     * Tạo hạng mục mới
     */
    public function store(Request $request, string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $user = $request->user();

        $validated = $request->validate([
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'notes' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo hạng mục nghiệm thu cho dự án này.'
            ], 403);
        }

        try {
            DB::beginTransaction();

            $item = $this->acceptanceService->upsertItem(array_merge($validated, [
                'acceptance_stage_id' => $stage->id,
            ]), null, $user);

            // Attach files if provided
            if (isset($validated['attachment_ids']) && is_array($validated['attachment_ids'])) {
                $this->acceptanceService->attachFiles($item, $validated['attachment_ids'], $user);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được tạo thành công.',
                'data' => $item->load(['attachments', 'creator', 'task', 'template.attachments'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo hạng mục.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết hạng mục
     */
    public function show(string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi tiết hạng mục nghiệm thu này.'
            ], 403);
        }

        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)
            ->with([
                'approver',
                'rejector',
                'creator',
                'updater',
                'task',
                'template.attachments',
                'submitter',
                'projectManagerApprover',
                'customerApprover',
                'attachments'
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $item
        ]);
    }

    /**
     * Cập nhật hạng mục
     */
    public function update(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật hạng mục nghiệm thu này.'
            ], 403);
        }

        // Không cho phép chỉnh sửa nếu đã được nghiệm thu
        if ($item->acceptance_status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể chỉnh sửa hạng mục đã được nghiệm thu.'
            ], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'notes' => 'nullable|string',
            'order' => 'sometimes|integer|min:0',
        ]);

        try {
            $this->acceptanceService->upsertItem($validated, $item, $user);

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được cập nhật.',
                'data' => $item->fresh()->load(['attachments', 'updater'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Xóa hạng mục
     */
    public function destroy(string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa hạng mục nghiệm thu này.'
            ], 403);
        }

        try {
            $this->acceptanceService->deleteItem($item);
            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được xóa.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Nghiệm thu hạng mục (Đạt)
     */
    public function approve(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt hạng mục nghiệm thu này.'
            ], 403);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        try {
            $this->acceptanceService->approveItem($item, $user, 3); // Level 3 for customer approve
            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được nghiệm thu (Đạt).',
                'data' => $item->fresh()->load(['approver', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Từ chối nghiệm thu hạng mục (Không đạt)
     */
    public function reject(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối hạng mục nghiệm thu này.'
            ], 403);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        try {
            $this->acceptanceService->rejectItem($item, $user, $validated['rejection_reason']);
            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã bị từ chối nghiệm thu (Không đạt).',
                'data' => $item->fresh()->load(['rejector'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Reset trạng thái nghiệm thu
     */
    public function reset(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền reset trạng thái hạng mục này.'
            ], 403);
        }

        $success = $item->resetAcceptance();

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể reset trạng thái nghiệm thu.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã reset trạng thái nghiệm thu.',
            'data' => $item->fresh()
        ]);
    }

    /**
     * Sắp xếp lại thứ tự hạng mục
     */
    public function reorder(Request $request, string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền sắp xếp hạng mục của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:acceptance_items,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        try {
            $this->acceptanceService->reorderItems($stage, $validated['items']);

            return response()->json([
                'success' => true,
                'message' => 'Thứ tự hạng mục đã được cập nhật.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật thứ tự.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Đính kèm file cho hạng mục
     */
    public function attachFiles(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đính kèm file cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $attached = $this->acceptanceService->attachFiles($item, $validated['attachment_ids'], $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã đính kèm ' . count($attached) . ' file.',
                'data' => $item->fresh(['attachments'])
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
     * Submit for approval (Người lập gửi duyệt)
     */
    public function submit(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        if (!$this->authService->can($user, Permissions::ACCEPTANCE_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt hạng mục của dự án này.'
            ], 403);
        }

        try {
            $this->acceptanceService->submitItem($item, $user);
            return response()->json([
                'success' => true,
                'message' => 'Đã gửi duyệt thành công.',
                'data' => $item->fresh()->load(['submitter', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Supervisor approve (Giám sát duyệt)
     */
    public function supervisorApprove(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nghiệm thu (Cấp 1 - Giám sát).'
            ], 403);
        }

        try {
            $this->acceptanceService->approveItem($item, $user, 1);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt thành công.',
                'data' => $item->fresh()->load(['supervisorApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Project Manager approve
     */
    public function projectManagerApprove(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt nghiệm thu (Cấp 2 - Quản lý dự án).'
            ], 403);
        }

        try {
            $this->acceptanceService->approveItem($item, $user, 2);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt thành công.',
                'data' => $item->fresh()->load(['projectManagerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Customer/Supervisor approve (Duyệt cuối)
     */
    public function customerApprove(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        try {
            $this->acceptanceService->approveItem($item, $user, 3);
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt nghiệm thu thành công.',
                'data' => $item->fresh()->load(['customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Reject from workflow
     */
    public function workflowReject(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        try {
            $this->acceptanceService->rejectItem($item, $user, $validated['rejection_reason']);
            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối nghiệm thu. Lỗi ghi nhận đã được tự động tạo.',
                'data' => $item->fresh()->load(['rejector', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
    /**
     * Hoàn duyệt hạng mục về trạng thái nháp
     */
    public function revertToDraft(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);
        $user = $request->user();

        // Check permission: Dedicated revert permission
        if (!$this->authService->can($user, Permissions::ACCEPTANCE_REVERT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hoàn duyệt hạng mục này.'
            ], 403);
        }

        try {
            $this->acceptanceService->revertItemToDraft($item->id);

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được hoàn về trạng thái nháp.',
                'data' => $item->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
    }
}
