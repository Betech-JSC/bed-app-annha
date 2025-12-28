<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\Project;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AcceptanceItemController extends Controller
{
    /**
     * Danh sách hạng mục của giai đoạn nghiệm thu
     */
    public function index(string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);

        $items = $stage->items()
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
            ->ordered()
            ->get();

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

        try {
            DB::beginTransaction();

            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $stage->items()->max('order') ?? -1;
                $validated['order'] = $maxOrder + 1;
            }

            // Determine initial status based on dates
            $acceptanceStatus = 'not_started';
            if (now()->toDateString() >= $validated['end_date']) {
                $acceptanceStatus = 'pending';
            }

            $item = AcceptanceItem::create([
                'acceptance_stage_id' => $stage->id,
                'task_id' => $validated['task_id'] ?? null,
                'acceptance_template_id' => $validated['acceptance_template_id'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'notes' => $validated['notes'] ?? null,
                'order' => $validated['order'] ?? $maxOrder + 1,
                'acceptance_status' => $acceptanceStatus,
                'workflow_status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Attach files if provided
            if (isset($validated['attachment_ids']) && is_array($validated['attachment_ids'])) {
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && $attachment->uploaded_by === $user->id) {
                        $attachment->update([
                            'attachable_type' => AcceptanceItem::class,
                            'attachable_id' => $item->id,
                        ]);
                    }
                }
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

        $item->update([
            ...$validated,
            'updated_by' => $user->id,
        ]);

        // Auto update status if end_date changed
        if (isset($validated['end_date']) && now()->toDateString() >= $validated['end_date']) {
            if ($item->acceptance_status === 'not_started') {
                $item->update(['acceptance_status' => 'pending']);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã được cập nhật.',
            'data' => $item->fresh()->load(['attachments', 'updater'])
        ]);
    }

    /**
     * Xóa hạng mục
     */
    public function destroy(string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);

        // Không cho phép xóa nếu đã được nghiệm thu
        if ($item->acceptance_status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hạng mục đã được nghiệm thu.'
            ], 400);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã được xóa.',
        ]);
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

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        if (!$item->can_accept) {
            return response()->json([
                'success' => false,
                'message' => 'Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua).'
            ], 400);
        }

        $success = $item->approve($user, $validated['notes'] ?? null);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể nghiệm thu hạng mục này.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã được nghiệm thu (Đạt).',
            'data' => $item->fresh()->load(['approver', 'attachments'])
        ]);
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

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if (!$item->can_accept) {
            return response()->json([
                'success' => false,
                'message' => 'Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua).'
            ], 400);
        }

        $success = $item->reject($validated['rejection_reason'], $user);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể từ chối nghiệm thu hạng mục này.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã bị từ chối nghiệm thu (Không đạt).',
            'data' => $item->fresh()->load(['rejector'])
        ]);
    }

    /**
     * Reset trạng thái nghiệm thu
     */
    public function reset(Request $request, string $projectId, string $stageId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($id);

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

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:acceptance_items,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['items'] as $itemData) {
                AcceptanceItem::where('id', $itemData['id'])
                    ->where('acceptance_stage_id', $stage->id)
                    ->update(['order' => $itemData['order']]);
            }

            DB::commit();

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

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->id === $project->project_manager_id)) {
                    $attachment->update([
                        'attachable_type' => AcceptanceItem::class,
                        'attachable_id' => $item->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            DB::commit();

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

        if ($item->workflow_status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt khi ở trạng thái draft.'
            ], 400);
        }

        // Chỉ cho phép người tạo nghiệm thu gửi duyệt
        if ($item->created_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ người tạo nghiệm thu mới có quyền gửi duyệt.'
            ], 403);
        }

        // Validate có upload hình ảnh
        if ($item->attachments()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng upload hình ảnh thực tế nghiệm thu trước khi gửi duyệt.'
            ], 400);
        }

        $item->workflow_status = 'submitted';
        $item->submitted_by = $user->id;
        $item->submitted_at = now();
        $item->save();

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi duyệt thành công.',
            'data' => $item->fresh()->load(['submitter', 'attachments'])
        ]);
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

        // Check if user is project manager
        if ($user->id !== $project->project_manager_id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ quản lý dự án mới có quyền duyệt.'
            ], 403);
        }

        if ($item->workflow_status !== 'submitted') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt khi đã được gửi duyệt.'
            ], 400);
        }

        // Kiểm tra lỗi (defects) liên quan đến task của item
        if ($item->task_id) {
            $openDefects = \App\Models\Defect::where('project_id', $project->id)
                ->where('task_id', $item->task_id)
                ->whereIn('status', ['open', 'in_progress'])
                ->count();

            if ($openDefects > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong. Vui lòng xử lý tất cả lỗi trước khi duyệt nghiệm thu."
                ], 400);
            }
        }

        $item->workflow_status = 'project_manager_approved';
        $item->project_manager_approved_by = $user->id;
        $item->project_manager_approved_at = now();
        $item->save();

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt thành công.',
            'data' => $item->fresh()->load(['projectManagerApprover', 'attachments'])
        ]);
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

        if ($item->workflow_status !== 'project_manager_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt sau khi quản lý dự án đã duyệt.'
            ], 400);
        }

        // Kiểm tra lỗi (defects) liên quan đến task của item
        if ($item->task_id) {
            $openDefects = \App\Models\Defect::where('project_id', $project->id)
                ->where('task_id', $item->task_id)
                ->whereIn('status', ['open', 'in_progress'])
                ->count();

            if ($openDefects > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong. Vui lòng xử lý tất cả lỗi trước khi duyệt nghiệm thu."
                ], 400);
            }
        }

        $item->workflow_status = 'customer_approved';
        $item->customer_approved_by = $user->id;
        $item->customer_approved_at = now();
        // Also update acceptance_status to approved
        $item->acceptance_status = 'approved';
        $item->approved_by = $user->id;
        $item->approved_at = now();
        $item->save();

        // Update project progress
        $item->updateProjectProgress();

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt nghiệm thu thành công.',
            'data' => $item->fresh()->load(['customerApprover', 'attachments'])
        ]);
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

        if (!in_array($item->workflow_status, ['submitted', 'project_manager_approved'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối khi đã được gửi duyệt.'
            ], 400);
        }

        $item->workflow_status = 'rejected';
        $item->rejection_reason = $validated['rejection_reason'];
        $item->rejected_by = $user->id;
        $item->rejected_at = now();
        $item->save();

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối nghiệm thu.',
            'data' => $item->fresh()->load(['rejector', 'attachments'])
        ]);
    }
}
