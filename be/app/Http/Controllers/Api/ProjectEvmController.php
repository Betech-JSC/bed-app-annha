<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\EvmCalculationService;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ProjectEvmController extends Controller
{
    protected $authService;
    protected $analysisService;

    public function __construct(
        AuthorizationService $authService,
        \App\Services\ProjectAnalysisService $analysisService
    ) {
        $this->authService = $authService;
        $this->analysisService = $analysisService;
    }

    /**
     * Tính toán EVM metrics cho project
     */
    public function calculate(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::FINANCE_VIEW, $project);

        $asOfDate = $request->query('as_of_date') 
            ? Carbon::parse($request->query('as_of_date'))
            : now();

        $metric = $this->analysisService->calculateEvm($project, $asOfDate);

        return response()->json([
            'success' => true,
            'message' => 'Đã tính toán EVM metrics',
            'data' => $metric
        ]);
    }

    /**
     * Lấy EVM metrics mới nhất
     */
    public function latest(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::FINANCE_VIEW, $project);

        $metric = $this->analysisService->getLatestEvm($project);

        if (!$metric) {
            // Tự động tính toán nếu chưa có
            $metric = $this->analysisService->calculateEvm($project);
        }

        return response()->json([
            'success' => true,
            'data' => $metric
        ]);
    }

    /**
     * Lấy lịch sử EVM metrics
     */
    public function history(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::FINANCE_VIEW, $project);

        $startDate = $request->query('start_date') 
            ? Carbon::parse($request->query('start_date'))
            : null;
        $endDate = $request->query('end_date') 
            ? Carbon::parse($request->query('end_date'))
            : null;

        $history = $this->analysisService->getEvmHistory($project, $startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $history
        ]);
    }

    /**
     * Phân tích hiệu suất dự án
     */
    public function analyze(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::FINANCE_VIEW, $project);

        $analysis = $this->analysisService->getProjectAnalysis($project);

        return response()->json([
            'success' => true,
            'data' => $analysis
        ]);
    }
}
