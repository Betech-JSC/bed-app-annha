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
                'defects' => function ($q) {
                    $q->whereIn('status', ['open', 'in_progress']);
                },
                'attachments',
                'items' => function ($q) {
                    $q->orderBy('order')
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
     * Duyệt giai đoạn nghiệm thu
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'approval_type' => ['required', 'in:internal,customer,design,owner'],
        ]);

        $approvalType = $validated['approval_type'];
        $success = false;

        switch ($approvalType) {
            case 'internal':
                // Giám sát nội bộ
                $success = $stage->approveInternal($user);
                break;
            case 'customer':
                // Giám sát khách hàng
                if ($project->customer_id === $user->id || $stage->status === 'internal_approved') {
                    $success = $stage->approveCustomer($user);
                }
                break;
            case 'design':
                // Thiết kế
                if ($stage->status === 'customer_approved') {
                    $success = $stage->approveDesign($user);
                }
                break;
            case 'owner':
                // Chủ nhà
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
                'customerApprover',
                'designApprover',
                'ownerApprover',
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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        try {
            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $project->acceptanceStages()->max('order') ?? 0;
                $validated['order'] = $maxOrder + 1;
            }

            $stage = AcceptanceStage::create([
                'project_id' => $project->id,
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
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'order' => 'sometimes|integer|min:0',
        ]);

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
