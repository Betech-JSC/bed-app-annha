<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ConstructionLog;
use App\Models\SubcontractorProgress;
use App\Models\MaterialTransaction;
use App\Models\Cost;
use App\Models\ProjectPayment;
use App\Models\SubcontractorPayment;
use App\Models\SupplierAcceptance;
use App\Models\SubcontractorAcceptance;
use App\Services\FinancialCalculationService;
use App\Services\TaskProgressService;
use App\Services\ProjectReportingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    protected $financialCalculationService;
    protected $reportingService;

    public function __construct(FinancialCalculationService $financialCalculationService, ProjectReportingService $reportingService)
    {
        $this->financialCalculationService = $financialCalculationService;
        $this->reportingService = $reportingService;
    }

    /**
     * Progress Report - Column-based overview with horizontal scrolling
     */
    public function progressReport(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $reportData = $this->reportingService->getProgressReport($project);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
            ], $reportData),
        ]);
    }

    /**
     * Báo cáo tiến độ thi công
     */
    public function constructionProgress(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        $overallPercentage = $this->reportingService->calculateOverallProgress($project);
        $weeklyStats = $this->reportingService->getWeeklyConstructionStats($projectId, $fromDate, $toDate);

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'overall_progress' => round($overallPercentage, 2),
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
                'weekly_statistics' => $weeklyStats,
            ],
        ]);
    }

    /**
     * Báo cáo tiến độ mua vật liệu và nhập nguyên vật liệu
     */
    public function materialProcurement(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        $procurementData = $this->reportingService->getMaterialProcurementSummary($projectId, $fromDate, $toDate);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
            ], $procurementData),
        ]);
    }

    /**
     * Báo cáo thu chi toàn dự án
     */
    public function projectRevenueExpense(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        $reportData = $this->reportingService->getProjectRevenueExpenseDetailed($project, $fromDate, $toDate);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
            ], $reportData),
        ]);
    }

    /**
     * Báo cáo vật liệu sử dụng
     */
    public function materialUsage(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        $reportData = $this->reportingService->getMaterialUsageStats($projectId, $fromDate, $toDate);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
            ], $reportData),
        ]);
    }

    /**
     * Báo cáo nhật ký thi công
     */
    public function constructionLogs(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        $reportData = $this->reportingService->getConstructionLogsSummary($projectId, $fromDate, $toDate);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
            ], $reportData),
        ]);
    }

    /**
     * Báo cáo công nợ và thanh toán
     */
    public function debtAndPayment(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $reportData = $this->reportingService->getDebtAndPaymentReport($project);

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
            ], $reportData),
        ]);
    }
}
