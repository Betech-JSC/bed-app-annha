<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectSummaryReportService;
use Illuminate\Http\Request;

class ProjectSummaryReportController extends Controller
{
    protected $reportService;

    public function __construct(ProjectSummaryReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Lấy báo cáo tổng hợp dự án
     */
    public function getSummaryReport(string $projectId)
    {
        $project = Project::findOrFail($projectId);

        $report = $this->reportService->getProjectSummaryReport($project);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Lấy chi tiết chi phí theo loại
     */
    public function getCostDetails(string $projectId, string $type)
    {
        $project = Project::findOrFail($projectId);

        // Validate type
        $allowedTypes = ['material', 'equipment', 'subcontractor', 'labor'];
        if (!in_array($type, $allowedTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'Loại chi phí không hợp lệ. Chỉ chấp nhận: ' . implode(', ', $allowedTypes),
            ], 400);
        }

        $details = $this->reportService->getCostDetailsByType($project, $type);

        return response()->json([
            'success' => true,
            'data' => $details,
        ]);
    }
}



