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

        // Get additional data for charts
        $logs = $project->constructionLogs()
            ->select('log_date', 'completion_percentage')
            ->orderBy('log_date')
            ->get();

        $subcontractors = $project->subcontractors()
            ->select('name', 'progress_status', 'total_quote')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'progress' => $progress,
                'logs' => $logs,
                'subcontractors' => $subcontractors,
            ]
        ]);
    }
}
