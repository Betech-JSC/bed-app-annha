<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CompanyFinancialReportService;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class CompanyFinancialReportController extends Controller
{
    use ApiAuthorization;
    protected $reportService;

    public function __construct(CompanyFinancialReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Lấy báo cáo tài chính tổng hợp công ty
     * 
     * GET /api/company-financial-reports/summary
     */
    public function summary(Request $request): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW);

        try {
            $startDate = $request->start_date 
                ? Carbon::parse($request->start_date) 
                : Carbon::now()->startOfMonth();
            
            $endDate = $request->end_date 
                ? Carbon::parse($request->end_date) 
                : Carbon::now()->endOfMonth();

            $summary = $this->reportService->getCompanyFinancialSummary($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo báo cáo tài chính: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lấy báo cáo P&L (Profit & Loss)
     * 
     * GET /api/company-financial-reports/profit-loss
     */
    public function profitLoss(Request $request): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW);

        try {
            $startDate = $request->start_date 
                ? Carbon::parse($request->start_date) 
                : Carbon::now()->startOfMonth();
            
            $endDate = $request->end_date 
                ? Carbon::parse($request->end_date) 
                : Carbon::now()->endOfMonth();

            $statement = $this->reportService->getProfitLossStatement($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $statement,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo báo cáo P&L: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lấy xu hướng tài chính theo tháng
     * 
     * GET /api/company-financial-reports/trend
     */
    public function trend(Request $request): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW);

        try {
            $months = $request->months ?? 6;
            $months = min(max($months, 1), 24); // Giới hạn 1-24 tháng

            $trends = $this->reportService->getFinancialTrend($months);

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo báo cáo xu hướng: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * So sánh hiệu suất giữa 2 kỳ
     * 
     * GET /api/company-financial-reports/compare
     */
    public function compare(Request $request): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW);

        try {
            $request->validate([
                'period1_start' => 'required|date',
                'period1_end' => 'required|date|after_or_equal:period1_start',
                'period2_start' => 'required|date',
                'period2_end' => 'required|date|after_or_equal:period2_start',
            ]);

            $comparison = $this->reportService->comparePerformance(
                Carbon::parse($request->period1_start),
                Carbon::parse($request->period1_end),
                Carbon::parse($request->period2_start),
                Carbon::parse($request->period2_end)
            );

            return response()->json([
                'success' => true,
                'data' => $comparison,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể so sánh hiệu suất: ' . $e->getMessage(),
            ], 500);
        }
    }
}
