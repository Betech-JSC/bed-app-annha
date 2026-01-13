<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceStage;
use App\Models\Project;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcceptanceStageController extends Controller
{
    /**
     * Danh sách giai đoạn nghiệm thu
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $stages = $project->acceptanceStages()
            ->with([
                'internalApprover',
                'customerApprover',
                'designApprover',
                'ownerApprover',
                'task', // BUSINESS RULE: Link to parent task (A) - parent task acts as "phase"
                'acceptanceTemplate', // Link to acceptance template from Settings
                'defects' => function ($q) {
                    $q->whereIn('status', ['open', 'in_progress']);
                },
                'attachments',
                'items' => function ($q) {
                    // BUSINESS RULE: Show ONLY Category A (parent) items, hide children A' and A''
                    $q->where(function ($query) {
                        // Items without task_id (Category A items)
                        $query->whereNull('task_id')
                            // OR items linked to parent tasks (task.parent_id is null)
                            ->orWhereHas('task', function ($taskQuery) {
                                $taskQuery->whereNull('parent_id');
                            });
                    })
                        ->orderBy('order')
                        ->with([
                            'attachments',
                            'task',
                            'template.attachments',
                            'submitter',
                            'projectManagerApprover',
                            'customerApprover',
                        ]);
                }
            ])
            ->orderBy('order')
            ->get();

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

        // Check if user is admin (full permission)
        $isAdmin = $user->role === 'admin' || $user->role === 'super_admin';

        // Check if user is supervisor
        $isSupervisor = \App\Models\ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->whereIn('role', ['supervisor', 'supervisor_guest'])
            ->exists();

        if (!$isAdmin && !$isSupervisor) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ giám sát mới có quyền duyệt.'
            ], 403);
        }

        // BUSINESS RULE: Admin có thể duyệt bất kỳ status nào, không cần kiểm tra status
        if (!$isAdmin && $stage->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt khi ở trạng thái pending.'
            ], 400);
        }

        $success = $stage->approveSupervisor($user);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt giai đoạn này.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt thành công.',
            'data' => $stage->fresh(['supervisorApprover'])
        ]);
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

        // Check if user is admin (full permission)
        $isAdmin = $user->role === 'admin' || $user->role === 'super_admin';

        // Check if user is project manager
        $isProjectManager = $user->id === $project->project_manager_id;

        if (!$isAdmin && !$isProjectManager) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ quản lý dự án mới có quyền duyệt.'
            ], 403);
        }

        // BUSINESS RULE: Admin có thể duyệt bất kỳ status nào, không cần kiểm tra status
        if (!$isAdmin && $stage->status !== 'supervisor_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt sau khi giám sát đã duyệt.'
            ], 400);
        }

        $success = $stage->approveProjectManager($user);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt giai đoạn này.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt thành công.',
            'data' => $stage->fresh(['projectManagerApprover'])
        ]);
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

        // Check if user is admin (full permission)
        $isAdmin = $user->role === 'admin' || $user->role === 'super_admin';

        // Check if user is customer
        $isCustomer = $project->customer_id === $user->id;

        if (!$isAdmin && !$isCustomer) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ khách hàng mới có quyền duyệt.'
            ], 403);
        }

        // BUSINESS RULE: Admin có thể duyệt bất kỳ status nào, không cần kiểm tra status
        if (!$isAdmin && $stage->status !== 'project_manager_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt sau khi quản lý dự án đã duyệt.'
            ], 400);
        }

        // Check for open defects (admin vẫn phải kiểm tra defects)
        if ($stage->has_open_defects) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt vì còn lỗi chưa được khắc phục.'
            ], 400);
        }

        $success = $stage->approveCustomer($user);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt giai đoạn này.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt nghiệm thu thành công.',
            'data' => $stage->fresh(['customerApprover'])
        ]);
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

        $approvalType = $validated['approval_type'];
        $success = false;

        switch ($approvalType) {
            case 'supervisor':
                $success = $stage->approveSupervisor($user);
                break;
            case 'project_manager':
                $success = $stage->approveProjectManager($user);
                break;
            case 'customer':
                $success = $stage->approveCustomer($user);
                break;
            case 'internal':
                // Legacy: Giám sát nội bộ
                $success = $stage->approveInternal($user);
                break;
            case 'design':
                // Legacy: Thiết kế
                if ($stage->status === 'customer_approved') {
                    $success = $stage->approveDesign($user);
                }
                break;
            case 'owner':
                // Legacy: Chủ nhà
                if ($project->customer_id === $user->id && $stage->status === 'design_approved') {
                    $success = $stage->approveOwner($user);
                }
                break;
        }

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt giai đoạn này. Vui lòng kiểm tra trạng thái và quyền truy cập.'
            ], 400);
        }

        // Check for open defects
        if ($approvalType === 'owner' && $stage->has_open_defects) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt vì còn lỗi chưa được khắc phục.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Giai đoạn nghiệm thu đã được duyệt.',
            'data' => $stage->fresh()
        ]);
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
            DB::beginTransaction();

            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->id === $project->project_manager_id)) {
                    $attachment->update([
                        'attachable_type' => AcceptanceStage::class,
                        'attachable_id' => $stage->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            DB::commit();

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

        // Check permission
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('acceptance.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo giai đoạn nghiệm thu.'
            ], 403);
        }

        $validated = $request->validate([
            'task_id' => 'required|exists:project_tasks,id', // BUSINESS RULE: REQUIRED - must be parent task (A)
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id', // Link to template from Settings
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        // BUSINESS RULE: Verify task_id is a parent task (no parent_id)
        $task = $project->tasks()->find($validated['task_id']);
        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại trong dự án này.'
            ], 404);
        }

        // Check if task is a parent task (no parent_id)
        if ($task->parent_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chọn công việc cha (Category A). Không thể chọn công việc con (A\', A\'\').'
            ], 422);
        }

        try {
            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $project->acceptanceStages()->max('order') ?? 0;
                $validated['order'] = $maxOrder + 1;
            }

            $stage = AcceptanceStage::create([
                'project_id' => $project->id,
                'task_id' => $validated['task_id'], // BUSINESS RULE: Link to parent task (A)
                'acceptance_template_id' => $validated['acceptance_template_id'] ?? null, // Link to template from Settings
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'order' => $validated['order'],
                'is_custom' => true,
                'status' => 'pending',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo giai đoạn nghiệm thu mới.',
                'data' => $stage->load(['attachments'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo giai đoạn nghiệm thu.',
                'error' => $e->getMessage()
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
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('acceptance.update')) {
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

        $stage->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật giai đoạn nghiệm thu.',
            'data' => $stage->fresh(['attachments'])
        ]);
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
        $isSuperAdmin = $user->role === 'admin' && $user->owner === true;
        if (!$isSuperAdmin && !$user->hasPermission('acceptance.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa giai đoạn nghiệm thu này.'
            ], 403);
        }

        // Không cho phép xóa nếu đã được duyệt hoàn toàn
        if ($stage->status === 'owner_approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa giai đoạn đã được duyệt hoàn toàn.'
            ], 400);
        }

        // Không cho phép xóa nếu có lỗi chưa được khắc phục
        if ($stage->has_open_defects) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa giai đoạn còn lỗi chưa được khắc phục.'
            ], 400);
        }

        $stage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa giai đoạn nghiệm thu.'
        ]);
    }
}
