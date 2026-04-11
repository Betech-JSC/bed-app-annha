<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\PredictiveAnalyticsService;
use App\Constants\Permissions;
use Illuminate\Http\Request;

class PredictiveAnalyticsController extends Controller
{
    use ApiAuthorization;
    protected $analyticsService;

    public function __construct(PredictiveAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Dự đoán ngày hoàn thành
     */
    public function predictCompletion(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::PROJECT_VIEW, $projectId);

        $project = Project::findOrFail($projectId);
        $prediction = $this->analyticsService->predictCompletionDate($project);

        return response()->json([
            'success' => true,
            'data' => $prediction
        ]);
    }

    /**
     * Dự đoán chi phí cuối cùng
     */
    public function predictCost(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::FINANCE_VIEW, $projectId);

        $project = Project::findOrFail($projectId);
        $prediction = $this->analyticsService->predictFinalCost($project);

        return response()->json([
            'success' => true,
            'data' => $prediction
        ]);
    }

    /**
     * Phân tích rủi ro delay
     */
    public function analyzeDelayRisk(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::PROJECT_VIEW, $projectId);

        $project = Project::findOrFail($projectId);
        $analysis = $this->analyticsService->analyzeDelayRisk($project);

        return response()->json([
            'success' => true,
            'data' => $analysis
        ]);
    }

    /**
     * Phân tích rủi ro vượt ngân sách
     */
    public function analyzeCostRisk(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::FINANCE_VIEW, $projectId);

        $project = Project::findOrFail($projectId);
        $analysis = $this->analyticsService->analyzeCostOverrunRisk($project);

        return response()->json([
            'success' => true,
            'data' => $analysis
        ]);
    }

    /**
     * Tổng hợp phân tích dự đoán
     */
    public function fullAnalysis(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::PROJECT_VIEW, $projectId);

        $project = Project::findOrFail($projectId);
        $analysis = $this->analyticsService->getPredictiveAnalysis($project);

        return response()->json([
            'success' => true,
            'data' => $analysis
        ]);
    }
}
