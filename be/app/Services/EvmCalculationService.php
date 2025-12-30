<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectEvmMetric;
use App\Models\ProjectBudget;
use App\Services\FinancialCalculationService;
use Carbon\Carbon;

class EvmCalculationService
{
    protected $financialCalculationService;

    public function __construct(FinancialCalculationService $financialCalculationService)
    {
        $this->financialCalculationService = $financialCalculationService;
    }

    /**
     * Tính toán EVM metrics cho project
     */
    public function calculateEvm(Project $project, ?Carbon $asOfDate = null): ProjectEvmMetric
    {
        $asOfDate = $asOfDate ?? now();
        $asOfDate = $asOfDate->toDateString();

        // Kiểm tra xem đã có metric cho ngày này chưa
        $existingMetric = ProjectEvmMetric::where('project_id', $project->id)
            ->where('calculation_date', $asOfDate)
            ->first();

        if ($existingMetric) {
            return $existingMetric;
        }

        // Lấy budget at completion (BAC)
        // Ưu tiên: Budget approved > Contract value > 0
        $budget = $project->budgets()
            ->where('status', 'approved')
            ->orderBy('budget_date', 'desc')
            ->first();

        $contractValue = $project->contract && $project->contract->status === 'approved'
            ? (float) $project->contract->contract_value
            : 0;

        $bac = $budget && $budget->total_budget > 0
            ? (float) $budget->total_budget
            : ($contractValue > 0 ? $contractValue : 0);

        // Tính Planned Value (PV) - Giá trị kế hoạch đến ngày hiện tại
        $pv = $this->calculatePlannedValue($project, $asOfDate, $bac);

        // Tính Earned Value (EV) - Giá trị đạt được
        $ev = $this->calculateEarnedValue($project, $asOfDate, $bac);

        // Tính Actual Cost (AC) - Chi phí thực tế
        $ac = $this->calculateActualCost($project, $asOfDate);

        // Tính Performance Indices
        // CPI = EV / AC (nếu AC > 0)
        // Nếu AC = 0: chưa có chi phí, không thể tính CPI
        // Nếu AC > 0 và EV = 0: chưa có tiến độ, CPI = 0
        // Nếu AC > 0 và EV > 0: tính CPI bình thường
        $cpi = null;
        if ($ac > 0) {
            $cpi = $ev > 0 ? (float) ($ev / $ac) : 0.0;
        }
        
        // SPI = EV / PV (nếu PV > 0)
        // Nếu PV = 0: chưa có ngân sách hoặc chưa đến thời điểm bắt đầu, không thể tính SPI
        // Nếu PV > 0 và EV = 0: chưa có tiến độ, SPI = 0
        // Nếu PV > 0 và EV > 0: tính SPI bình thường
        $spi = null;
        if ($pv > 0) {
            $spi = $ev > 0 ? (float) ($ev / $pv) : 0.0;
        }

        // Tính Variances
        $cv = (float) ($ev - $ac); // Cost Variance
        $sv = (float) ($ev - $pv); // Schedule Variance

        // Tính Estimates
        // EAC = BAC / CPI (nếu CPI > 0 và BAC > 0)
        $eac = ($cpi > 0 && $bac > 0) ? (float) ($bac / $cpi) : ($bac > 0 ? $bac : null);
        // ETC = EAC - AC
        $etc = $eac !== null ? (float) ($eac - $ac) : null;
        // VAC = BAC - EAC
        $vac = ($eac !== null && $bac > 0) ? (float) ($bac - $eac) : null;

        // Progress percentage - đảm bảo luôn có giá trị hợp lệ (0-100)
        $progress = 0.0;
        if ($project->progress && $project->progress->overall_percentage !== null) {
            $progress = (float) $project->progress->overall_percentage;
            // Đảm bảo progress trong khoảng 0-100
            $progress = max(0, min(100, $progress));
        }

        // Tạo hoặc cập nhật metric
        $metric = ProjectEvmMetric::updateOrCreate(
            [
                'project_id' => $project->id,
                'calculation_date' => $asOfDate,
            ],
            [
                'planned_value' => (float) $pv,
                'earned_value' => (float) $ev,
                'actual_cost' => (float) $ac,
                'cost_performance_index' => $cpi !== null ? (float) $cpi : null,
                'schedule_performance_index' => $spi !== null ? (float) $spi : null,
                'cost_variance' => (float) $cv,
                'schedule_variance' => (float) $sv,
                'estimate_at_completion' => $eac !== null ? (float) $eac : null,
                'estimate_to_complete' => $etc !== null ? (float) $etc : null,
                'variance_at_completion' => $vac !== null ? (float) $vac : null,
                'budget_at_completion' => $bac !== null ? (float) $bac : null,
                'progress_percentage' => (float) $progress,
                'calculated_by' => auth()->id(),
            ]
        );

        return $metric;
    }

    /**
     * Tính Planned Value (PV) - Giá trị kế hoạch đến ngày hiện tại
     */
    protected function calculatePlannedValue(Project $project, string $asOfDate, float $bac): float
    {
        if (!$project->start_date || !$project->end_date || $bac == 0) {
            return 0;
        }

        $startDate = Carbon::parse($project->start_date);
        $endDate = Carbon::parse($project->end_date);
        $currentDate = Carbon::parse($asOfDate);

        // Nếu chưa bắt đầu
        if ($currentDate < $startDate) {
            return 0;
        }

        // Nếu đã qua hạn
        if ($currentDate >= $endDate) {
            return $bac;
        }

        // Tính % thời gian đã trôi qua
        $totalDays = $startDate->diffInDays($endDate);
        $elapsedDays = $startDate->diffInDays($currentDate);
        $timePercentage = $totalDays > 0 ? ($elapsedDays / $totalDays) : 0;

        // PV = BAC * % thời gian đã trôi qua
        return $bac * $timePercentage;
    }

    /**
     * Tính Earned Value (EV) - Giá trị đạt được dựa trên tiến độ thực tế
     */
    protected function calculateEarnedValue(Project $project, string $asOfDate, float $bac): float
    {
        $progress = $project->progress ? (float) $project->progress->overall_percentage : 0.0;
        
        // Đảm bảo progress trong khoảng 0-100
        $progress = max(0, min(100, $progress));
        
        // EV = BAC * % tiến độ thực tế
        return $bac > 0 ? (float) ($bac * ($progress / 100)) : 0.0;
    }

    /**
     * Tính Actual Cost (AC) - Chi phí thực tế đến ngày hiện tại
     */
    protected function calculateActualCost(Project $project, string $asOfDate): float
    {
        $asOfDate = Carbon::parse($asOfDate);
        
        // Lấy tổng chi phí đã phát sinh đến ngày hiện tại
        // Ưu tiên: Costs với cost_date <= asOfDate > calculateTotalCosts (tất cả costs)
        
        // Lọc chỉ lấy costs đến ngày hiện tại
        $costsByDate = $project->costs()
            ->where('status', 'approved')
            ->whereDate('cost_date', '<=', $asOfDate)
            ->sum('amount');

        // Nếu có costs theo ngày, dùng nó
        if ($costsByDate > 0) {
            return (float) $costsByDate;
        }

        // Nếu không có costs theo ngày, lấy từ calculateTotalCosts
        $costsData = $this->financialCalculationService->calculateTotalCosts($project);
        $totalCosts = $costsData['total_costs'] ?? 0;
        
        // Nếu totalCosts = 0, có thể chưa có chi phí nào được ghi nhận
        return (float) $totalCosts;
    }

    /**
     * Lấy EVM metrics mới nhất của project
     */
    public function getLatestMetrics(Project $project): ?ProjectEvmMetric
    {
        return $project->evmMetrics()
            ->latest('calculation_date')
            ->first();
    }

    /**
     * Lấy EVM metrics theo khoảng thời gian
     */
    public function getMetricsHistory(Project $project, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $query = $project->evmMetrics()->orderBy('calculation_date', 'asc');

        if ($startDate) {
            $query->where('calculation_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('calculation_date', '<=', $endDate);
        }

        return $query->get()->toArray();
    }

    /**
     * Phân tích hiệu suất dự án dựa trên EVM
     */
    public function analyzePerformance(Project $project): array
    {
        $metric = $this->getLatestMetrics($project);
        
        if (!$metric) {
            $metric = $this->calculateEvm($project);
        }

        $analysis = [
            'status' => 'on_track',
            'cost_status' => 'on_budget',
            'schedule_status' => 'on_schedule',
            'warnings' => [],
            'recommendations' => [],
        ];

        // Phân tích Cost Performance
        if ($metric->cost_performance_index) {
            if ($metric->cost_performance_index < 0.9) {
                $analysis['cost_status'] = 'over_budget';
                $analysis['status'] = 'at_risk';
                $analysis['warnings'][] = 'Chi phí vượt ngân sách đáng kể (CPI < 0.9)';
                $analysis['recommendations'][] = 'Cần xem xét lại ngân sách và tối ưu chi phí';
            } elseif ($metric->cost_performance_index < 1.0) {
                $analysis['cost_status'] = 'slightly_over';
                $analysis['warnings'][] = 'Chi phí đang vượt ngân sách nhẹ';
            } elseif ($metric->cost_performance_index > 1.1) {
                $analysis['cost_status'] = 'under_budget';
                $analysis['recommendations'][] = 'Dự án đang tiết kiệm chi phí tốt';
            }
        }

        // Phân tích Schedule Performance
        if ($metric->schedule_performance_index) {
            if ($metric->schedule_performance_index < 0.9) {
                $analysis['schedule_status'] = 'delayed';
                $analysis['status'] = 'at_risk';
                $analysis['warnings'][] = 'Tiến độ chậm đáng kể (SPI < 0.9)';
                $analysis['recommendations'][] = 'Cần tăng tốc độ thi công hoặc điều chỉnh kế hoạch';
            } elseif ($metric->schedule_performance_index < 1.0) {
                $analysis['schedule_status'] = 'slightly_delayed';
                $analysis['warnings'][] = 'Tiến độ đang chậm nhẹ';
            } elseif ($metric->schedule_performance_index > 1.1) {
                $analysis['schedule_status'] = 'ahead';
                $analysis['recommendations'][] = 'Dự án đang vượt tiến độ';
            }
        }

        // Phân tích Estimate at Completion
        if ($metric->estimate_at_completion && $metric->budget_at_completion) {
            $variancePercentage = (($metric->estimate_at_completion - $metric->budget_at_completion) / $metric->budget_at_completion) * 100;
            
            if ($variancePercentage > 10) {
                $analysis['status'] = 'at_risk';
                $analysis['warnings'][] = "Dự kiến vượt ngân sách {$variancePercentage}%";
            }
        }

        return array_merge([
            'metric' => $metric,
            'cpi' => $metric->cost_performance_index,
            'spi' => $metric->schedule_performance_index,
            'cv' => $metric->cost_variance,
            'sv' => $metric->schedule_variance,
            'eac' => $metric->estimate_at_completion,
            'etc' => $metric->estimate_to_complete,
            'vac' => $metric->variance_at_completion,
        ], $analysis);
    }
}

