<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Defect;
use App\Models\DefectHistory;
use App\Models\Project;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DefectController extends Controller
{
    /**
     * Danh sách lỗi
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = $project->defects()
            ->with([
                'reporter',
                'fixer',
                'verifier',
                'task',
                'acceptanceStage',
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

        $validated = $request->validate([
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_stage_id' => 'nullable|exists:acceptance_stages,id',
            'description' => 'required|string|max:2000',
            'severity' => ['required', 'in:low,medium,high,critical'],
            'before_image_ids' => 'nullable|array',
            'before_image_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $defect = Defect::create([
                'project_id' => $project->id,
                'task_id' => $validated['task_id'] ?? null,
                'reported_by' => $user->id,
                'acceptance_stage_id' => $validated['acceptance_stage_id'] ?? null,
                'description' => $validated['description'],
                'severity' => $validated['severity'],
                'status' => 'open',
            ]);

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
                'data' => $defect->fresh(['reporter', 'acceptanceStage', 'attachments'])
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
        $defect = Defect::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'description' => 'sometimes|string|max:2000',
            'severity' => ['sometimes', 'in:low,medium,high,critical'],
            'status' => ['sometimes', 'in:open,in_progress,fixed,verified'],
            'expected_completion_date' => 'nullable|date',
            'after_image_ids' => 'nullable|array',
            'after_image_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        $oldStatus = $defect->status;

        // Handle status transitions
        if (isset($validated['status'])) {
            switch ($validated['status']) {
                case 'in_progress':
                    $defect->markAsInProgress($user);
                    // Update expected_completion_date if provided
                    if (isset($validated['expected_completion_date'])) {
                        $defect->expected_completion_date = $validated['expected_completion_date'];
                        $defect->save();
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

        return response()->json([
            'success' => true,
            'message' => 'Lỗi đã được cập nhật.',
            'data' => $defect->fresh(['reporter', 'fixer', 'verifier', 'task', 'acceptanceStage', 'attachments'])
        ]);
    }

    /**
     * Chi tiết lỗi với lịch sử
     */
    public function show(string $projectId, string $id)
    {
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
}
