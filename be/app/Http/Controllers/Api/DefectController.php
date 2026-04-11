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
    /**
     * Danh sách lỗi
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::DEFECT_VIEW, $project);

        $query = $project->defects()
            ->with([
                'reporter',
                'fixer',
                'verifier',
                'task',
                'acceptanceStage',
                'acceptanceStage',
                'violatedCriteria',
                'attachments' => function ($q) {
                    $q->orderBy('description')->orderBy('created_at');
                }
            ]);

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by severity
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }

        $defects = $query->orderByDesc('created_at')->get();

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
            'severity' => ['required', 'in:low,medium,high,critical'],
            'before_image_ids' => 'nullable|array',
            'before_image_ids.*' => 'required|integer|exists:attachments,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'defect_type' => 'nullable|in:standard_violation,other',
            'violated_criteria_ids' => 'nullable|array',
            'violated_criteria_ids.*' => 'required|integer|exists:acceptance_criteria,id',
        ]);

        // BUSINESS RULE: Auto-link task_id from acceptance_stage if provided
        $taskId = $validated['task_id'] ?? null;
        if (!$taskId && isset($validated['acceptance_stage_id'])) {
            $acceptanceStage = \App\Models\AcceptanceStage::find($validated['acceptance_stage_id']);
            if ($acceptanceStage && $acceptanceStage->task_id) {
                $taskId = $acceptanceStage->task_id; // Auto-link to Category A (parent task)
            }
        }

        try {
            DB::beginTransaction();

            $defect = Defect::create([
                'project_id' => $project->id,
                'task_id' => $taskId, // BUSINESS RULE: Auto-linked from acceptance_stage or provided
                'reported_by' => $user->id,
                'acceptance_stage_id' => $validated['acceptance_stage_id'] ?? null,
                'acceptance_stage_id' => $validated['acceptance_stage_id'] ?? null,
                'acceptance_template_id' => $validated['acceptance_template_id'] ?? null,
                'defect_type' => $validated['defect_type'] ?? 'other',
                'description' => $validated['description'],
                'severity' => $validated['severity'],
                'status' => 'open',
            ]);

            // Sync violated criteria if provided
            if (isset($validated['violated_criteria_ids']) && is_array($validated['violated_criteria_ids'])) {
                $defect->violatedCriteria()->sync($validated['violated_criteria_ids']);
            }

            // Create history record
            DefectHistory::create([
                'defect_id' => $defect->id,
                'action' => 'created',
                'new_status' => 'open',
                'user_id' => $user->id,
            ]);

            // Attach before images
            if (isset($validated['before_image_ids']) && is_array($validated['before_image_ids'])) {
                foreach ($validated['before_image_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment && $attachment->uploaded_by === $user->id) {
                        $attachment->update([
                            'attachable_type' => Defect::class,
                            'attachable_id' => $defect->id,
                            'description' => 'before', // Mark as before image
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lỗi đã được ghi nhận.',
                'message' => 'Lỗi đã được ghi nhận.',
                'data' => $defect->fresh(['reporter', 'acceptanceStage', 'attachments', 'violatedCriteria'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật lỗi
     */
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
            'after_image_ids' => 'nullable|array',
            'after_image_ids.*' => 'required|integer|exists:attachments,id',
            'violated_criteria_ids' => 'nullable|array',
            'violated_criteria_ids.*' => 'required|integer|exists:acceptance_criteria,id',
        ]);

        $oldStatus = $defect->status;

        // Handle status transitions
        if (isset($validated['status'])) {
            switch ($validated['status']) {
                case 'in_progress':
                    // If moving back to in_progress from fixed/verified loops (Rejection)
                    if ($request->has('rejection_reason')) {
                        $defect->markAsRejected($user, $request->input('rejection_reason'));
                    } else {
                        $defect->markAsInProgress($user);
                        if (isset($validated['expected_completion_date'])) {
                            $defect->expected_completion_date = $validated['expected_completion_date'];
                            $defect->save();
                        }
                    }
                    break;
                case 'fixed':
                    // Validate that after images are required when marking as fixed
                    if (empty($validated['after_image_ids']) || !is_array($validated['after_image_ids']) || count($validated['after_image_ids']) === 0) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Vui lòng upload hình ảnh đã sửa trước khi xác nhận hoàn thành.',
                        ], 422);
                    }
                    $defect->markAsFixed($user);
                    // Attach after images when marking as fixed
                    if (isset($validated['after_image_ids']) && is_array($validated['after_image_ids'])) {
                        foreach ($validated['after_image_ids'] as $attachmentId) {
                            $attachment = Attachment::find($attachmentId);
                            if ($attachment && $attachment->uploaded_by === $user->id) {
                                $attachment->update([
                                    'attachable_type' => Defect::class,
                                    'attachable_id' => $defect->id,
                                    'description' => 'after', // Mark as after image
                                ]);
                            }
                        }
                    }
                    break;
                case 'verified':
                    $defect->markAsVerified($user);
                    break;
                default:
                    $defect->update(['status' => $validated['status']]);
            }
            
            // Create history record for status change
            if ($oldStatus !== $validated['status']) {
                DefectHistory::create([
                    'defect_id' => $defect->id,
                    'action' => 'status_changed',
                    'old_status' => $oldStatus,
                    'new_status' => $validated['status'],
                    'user_id' => $user->id,
                ]);
            }
            
            unset($validated['status']);
        }
        
        // Update expected_completion_date if provided separately
        if (isset($validated['expected_completion_date'])) {
            $defect->expected_completion_date = $validated['expected_completion_date'];
            $defect->save();
            unset($validated['expected_completion_date']);
        }

        // Remove after_image_ids from validated as it's already handled
        unset($validated['after_image_ids']);

        if (!empty($validated)) {
            $defect->update($validated);
        }

        // Sync violated criteria if provided
        if (isset($validated['violated_criteria_ids']) && is_array($validated['violated_criteria_ids'])) {
            $defect->violatedCriteria()->sync($validated['violated_criteria_ids']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lỗi đã được cập nhật.',
            'message' => 'Lỗi đã được cập nhật.',
            'data' => $defect->fresh(['reporter', 'fixer', 'verifier', 'task', 'acceptanceStage', 'attachments', 'violatedCriteria'])
        ]);
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
                    $q->orderBy('description')->orderBy('created_at');
                },
                'histories.user' => function ($q) {
                    $q->orderByDesc('created_at');
                }
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

            foreach ($validated['criteria'] as $item) {
                // Check if criterio exists in defect
                $exists = $defect->violatedCriteria()->where('acceptance_criterion_id', $item['id'])->exists();
                if ($exists) {
                    $defect->violatedCriteria()->updateExistingPivot($item['id'], [
                        'status' => $item['status'],
                        'verified_at' => now(),
                        'verified_by' => $user->id,
                    ]);
                }
            }
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật trạng thái tiêu chí.',
                'data' => $defect->fresh(['violatedCriteria'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
