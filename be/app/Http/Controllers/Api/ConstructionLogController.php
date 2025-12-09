<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConstructionLog;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                ...$validated,
            ]);

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
                'data' => $log->load(['creator'])
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
}
