<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\EvmCalculationService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ProjectEvmController extends Controller
{
    protected $evmService;

    public function __construct(EvmCalculationService $evmService)
    {
        $this->evmService = $evmService;
    }

    /**
     * Tính toán EVM metrics cho project
     */
    public function calculate(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        
        $asOfDate = $request->query('as_of_date') 
            ? Carbon::parse($request->query('as_of_date'))
            : now();

        $metric = $this->evmService->calculateEvm($project, $asOfDate);

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
        $metric = $this->evmService->getLatestMetrics($project);

        if (!$metric) {
            // Tự động tính toán nếu chưa có
            $metric = $this->evmService->calculateEvm($project);
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
        
        $startDate = $request->query('start_date') 
            ? Carbon::parse($request->query('start_date'))
            : null;
        $endDate = $request->query('end_date') 
            ? Carbon::parse($request->query('end_date'))
            : null;

        $history = $this->evmService->getMetricsHistory($project, $startDate, $endDate);

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
        $analysis = $this->evmService->analyzePerformance($project);

        return response()->json([
            'success' => true,
            'data' => $analysis
        ]);
    }
}
