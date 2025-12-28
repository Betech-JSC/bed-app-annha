<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectProgress;

class ProjectProgressController extends Controller
{
    /**
     * Xem tiến độ dự án
     */
    public function show(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $progress = $project->progress;

        if (!$progress) {
            // Create default progress if not exists
            $progress = $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'manual',
            ]);
        }

        // Tự động tính lại tiến độ từ nghiệm thu (ưu tiên)
        // Hoặc từ các nguồn khác nếu không có nghiệm thu
        $progress->calculateOverall();

        // Get additional data for charts
        $logs = $project->constructionLogs()
            ->select('log_date', 'completion_percentage')
            ->orderBy('log_date')
            ->get();

        $subcontractors = $project->subcontractors()
            ->select('name', 'progress_status', 'total_quote')
            ->get();

        // Thông tin nghiệm thu
        $acceptanceStages = $project->acceptanceStages()
            ->with(['items' => function ($query) {
                $query->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        $acceptanceStats = [
            'total_stages' => $acceptanceStages->count(),
            'fully_approved_stages' => $acceptanceStages->where('status', 'owner_approved')->count(),
            'total_items' => $acceptanceStages->sum(function ($stage) {
                return $stage->items->count();
            }),
            'approved_items' => $acceptanceStages->sum(function ($stage) {
                return $stage->items->where('acceptance_status', 'approved')->count();
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'progress' => $progress->fresh(), // Refresh để lấy giá trị mới nhất
                'logs' => $logs,
                'subcontractors' => $subcontractors,
                'acceptance_stages' => $acceptanceStages,
                'acceptance_stats' => $acceptanceStats,
            ]
        ]);
    }
}
