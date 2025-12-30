<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectMonitoringService;
use Illuminate\Http\Request;

class ProjectMonitoringController extends Controller
{
    protected $monitoringService;

    public function __construct(ProjectMonitoringService $monitoringService)
    {
        $this->monitoringService = $monitoringService;
    }

    /**
     * Dashboard tổng quan - Tất cả projects
     */
    public function dashboard(Request $request)
    {
        $userId = $request->user()?->id;
        $data = $this->monitoringService->getDashboardData($userId);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Monitoring data cho một project cụ thể
     */
    public function projectMonitoring(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $data = $this->monitoringService->getProjectMonitoringData($project);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }
}
