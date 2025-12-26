<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConstructionLog;
use App\Models\Project;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ConstructionLogController extends Controller
{
    /**
     * Danh sách nhật ký công trình
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = $project->constructionLogs()
            ->with(['creator', 'attachments'])
            ->orderByDesc('log_date');

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('log_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('log_date', '<=', $request->end_date);
        }

        $logs = $query->paginate(30);

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }

    /**
     * Tạo nhật ký công trình
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $validated = $request->validate([
            'log_date' => 'required|date',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            // Check if log for this date already exists
            $exists = ConstructionLog::where('project_id', $project->id)
                ->where('log_date', $validated['log_date'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhật ký cho ngày này đã tồn tại.'
                ], 400);
            }

            $log = ConstructionLog::create([
                'project_id' => $project->id,
                'created_by' => $user->id,
                'log_date' => $validated['log_date'],
                'weather' => $validated['weather'] ?? null,
                'personnel_count' => $validated['personnel_count'] ?? null,
                'completion_percentage' => $validated['completion_percentage'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Attach files if provided
            if (isset($validated['attachment_ids']) && is_array($validated['attachment_ids'])) {
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment) {
                        $attachment->update([
                            'attachable_id' => $log->id,
                            'attachable_type' => ConstructionLog::class,
                        ]);
                    }
                }
            }

            // Update project progress if percentage is provided
            if (isset($validated['completion_percentage'])) {
                $progress = $project->progress;
                if ($progress) {
                    $progress->updateManual($validated['completion_percentage']);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được tạo.',
                'data' => $log->load(['creator', 'attachments'])
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
     * Cập nhật nhật ký công trình
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Chỉ cho phép người tạo hoặc project manager cập nhật
        if ($log->created_by !== $user->id && $project->project_manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật nhật ký này.'
            ], 403);
        }

        $validated = $request->validate([
            'log_date' => 'sometimes|date',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            // Check if log date is being changed and conflicts with another log
            if (isset($validated['log_date']) && $validated['log_date'] !== $log->log_date) {
                $exists = ConstructionLog::where('project_id', $project->id)
                    ->where('log_date', $validated['log_date'])
                    ->where('id', '!=', $log->id)
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nhật ký cho ngày này đã tồn tại.'
                    ], 400);
                }
            }

            $log->update($validated);

            // Update attachments if provided
            if (isset($validated['attachment_ids'])) {
                // Detach existing attachments
                $log->attachments()->update([
                    'attachable_id' => null,
                    'attachable_type' => null,
                ]);

                // Attach new files
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment) {
                        $attachment->update([
                            'attachable_id' => $log->id,
                            'attachable_type' => ConstructionLog::class,
                        ]);
                    }
                }
            }

            // Update project progress if percentage is provided
            if (isset($validated['completion_percentage'])) {
                $progress = $project->progress;
                if ($progress) {
                    $progress->updateManual($validated['completion_percentage']);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được cập nhật.',
                'data' => $log->load(['creator', 'attachments'])
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

    /**
     * Xóa nhật ký công trình
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Chỉ cho phép người tạo hoặc project manager xóa
        if ($log->created_by !== $user->id && $project->project_manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhật ký này.'
            ], 403);
        }

        try {
            DB::beginTransaction();

            // Delete attachments
            foreach ($log->attachments as $attachment) {
                // Delete file from storage
                if ($attachment->file_path && Storage::disk('public')->exists($attachment->file_path)) {
                    Storage::disk('public')->delete($attachment->file_path);
                }
                $attachment->delete();
            }

            // Delete log
            $log->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được xóa.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa nhật ký.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
