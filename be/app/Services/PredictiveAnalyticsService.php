<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectProgress;
use App\Services\FinancialCalculationService;
use Carbon\Carbon;

class PredictiveAnalyticsService
{
    protected $financialCalculationService;

    public function __construct(FinancialCalculationService $financialCalculationService)
    {
        $this->financialCalculationService = $financialCalculationService;
    }

    /**
     * Dự đoán ngày hoàn thành dự án
     */
    public function predictCompletionDate(Project $project): array
    {
        if (!$project->start_date || !$project->end_date) {
            return [
                'predicted_date' => null,
                'confidence' => 0,
                'delay_days' => 0,
                'method' => 'insufficient_data',
            ];
        }

        $startDate = Carbon::parse($project->start_date);
        $plannedEndDate = Carbon::parse($project->end_date);
        $today = Carbon::today();

        // Tính tiến độ hiện tại
        $progress = $project->progress ? $project->progress->overall_percentage : 0;
        
        if ($progress <= 0) {
            return [
                'predicted_date' => $plannedEndDate->toDateString(),
                'confidence' => 0.3,
                'delay_days' => 0,
                'method' => 'no_progress',
            ];
        }

        // Tính số ngày đã trôi qua
        $elapsedDays = $startDate->diffInDays($today);
        
        // Tính tốc độ tiến độ thực tế (%/ngày)
        $actualRate = $elapsedDays > 0 ? ($progress / $elapsedDays) : 0;
        
        // Dự đoán số ngày còn lại để đạt 100%
        $remainingProgress = 100 - $progress;
        $predictedRemainingDays = $actualRate > 0 ? ($remainingProgress / $actualRate) : 0;
        
        // Ngày hoàn thành dự đoán
        $predictedDate = $today->copy()->addDays(ceil($predictedRemainingDays));
        
        // Tính delay
        $delayDays = max(0, $predictedDate->diffInDays($plannedEndDate));
        if ($predictedDate > $plannedEndDate) {
            $delayDays = $predictedDate->diffInDays($plannedEndDate);
        } else {
            $delayDays = -$plannedEndDate->diffInDays($predictedDate);
        }

        // Confidence dựa trên số lượng dữ liệu
        $confidence = min(0.9, 0.5 + ($elapsedDays / 100) * 0.4);

        return [
            'predicted_date' => $predictedDate->toDateString(),
            'confidence' => round($confidence, 2),
            'delay_days' => $delayDays,
            'method' => 'progress_rate',
            'current_progress' => $progress,
            'elapsed_days' => $elapsedDays,
            'actual_rate' => round($actualRate, 4),
            'planned_end_date' => $plannedEndDate->toDateString(),
        ];
    }

    /**
     * Dự đoán chi phí cuối cùng (Cost Overrun)
     */
    public function predictFinalCost(Project $project): array
    {
        $budget = $project->budgets()
            ->where('status', 'approved')
            ->orderBy('budget_date', 'desc')
            ->first();

        // Ưu tiên: Budget approved > Contract value
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

        if ($bac <= 0) {
            return [
                'predicted_cost' => 0,
                'overrun_amount' => 0,
                'overrun_percentage' => 0,
                'confidence' => 0,
                'method' => 'no_budget',
                'current_cost' => 0,
                'budget' => 0,
                'cpi' => null,
                'progress' => 0,
            ];
        }

        $progress = $project->progress && $project->progress->overall_percentage !== null
            ? (float) $project->progress->overall_percentage
            : 0.0;
        $progress = max(0, min(100, $progress));
        
        // Tính chi phí thực tế hiện tại
        $costsData = $this->financialCalculationService->calculateTotalCosts($project);
        $actualCost = (float) ($costsData['total_costs'] ?? 0);
        
        if ($progress <= 0 || $actualCost <= 0) {
            // Chưa có tiến độ hoặc chưa có chi phí, dự đoán dựa trên ngân sách
            return [
                'predicted_cost' => $bac,
                'overrun_amount' => 0,
                'overrun_percentage' => 0,
                'confidence' => 0.3,
                'method' => 'no_progress',
                'current_cost' => $actualCost,
                'budget' => $bac,
                'cpi' => null,
                'progress' => $progress,
            ];
        }

        // Tính CPI (Cost Performance Index)
        // CPI = EV / AC, với EV = BAC * (progress / 100)
        $earnedValue = $bac * ($progress / 100);
        $cpi = $actualCost > 0 ? ($earnedValue / $actualCost) : 1.0;

        // Dự đoán chi phí cuối cùng: EAC = BAC / CPI
        $predictedCost = $cpi > 0 ? ($bac / $cpi) : $bac;
        
        $overrunAmount = $predictedCost - $bac;
        $overrunPercentage = $bac > 0 ? (($overrunAmount / $bac) * 100) : 0;

        // Confidence dựa trên tiến độ và số lượng dữ liệu
        $confidence = min(0.85, 0.5 + ($progress / 100) * 0.35);

        return [
            'predicted_cost' => round($predictedCost, 2),
            'overrun_amount' => round($overrunAmount, 2),
            'overrun_percentage' => round($overrunPercentage, 2),
            'confidence' => round($confidence, 2),
            'method' => 'cpi_based',
            'current_cost' => round($actualCost, 2),
            'budget' => round($bac, 2),
            'cpi' => round($cpi, 4),
            'progress' => round($progress, 2),
        ];
    }

    /**
     * Phân tích rủi ro delay
     */
    public function analyzeDelayRisk(Project $project): array
    {
        $prediction = $this->predictCompletionDate($project);
        
        $riskLevel = 'low';
        $riskScore = 0;

        if ($prediction['delay_days'] > 30) {
            $riskLevel = 'critical';
            $riskScore = 90;
        } elseif ($prediction['delay_days'] > 14) {
            $riskLevel = 'high';
            $riskScore = 70;
        } elseif ($prediction['delay_days'] > 7) {
            $riskLevel = 'medium';
            $riskScore = 50;
        } elseif ($prediction['delay_days'] > 0) {
            $riskLevel = 'low';
            $riskScore = 30;
        }

        // Kiểm tra tasks chậm tiến độ
        $delayedTasks = $project->tasks()
            ->where('status', 'in_progress')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->count();

        if ($delayedTasks > 0) {
            $riskScore += min(20, $delayedTasks * 5);
            if ($riskScore > 50) {
                $riskLevel = 'high';
            }
        }

        return [
            'risk_level' => $riskLevel,
            'risk_score' => min(100, $riskScore),
            'delay_days' => $prediction['delay_days'],
            'predicted_date' => $prediction['predicted_date'],
            'delayed_tasks_count' => $delayedTasks,
            'recommendations' => $this->getDelayRecommendations($riskLevel, $prediction['delay_days']),
        ];
    }

    /**
     * Phân tích rủi ro vượt ngân sách
     */
    public function analyzeCostOverrunRisk(Project $project): array
    {
        $prediction = $this->predictFinalCost($project);
        
        if (!$prediction['predicted_cost']) {
            return [
                'risk_level' => 'unknown',
                'risk_score' => 0,
                'overrun_percentage' => 0,
            ];
        }

        $overrunPercentage = $prediction['overrun_percentage'];
        $riskLevel = 'low';
        $riskScore = 0;

        if ($overrunPercentage > 20) {
            $riskLevel = 'critical';
            $riskScore = 90;
        } elseif ($overrunPercentage > 10) {
            $riskLevel = 'high';
            $riskScore = 70;
        } elseif ($overrunPercentage > 5) {
            $riskLevel = 'medium';
            $riskScore = 50;
        } elseif ($overrunPercentage > 0) {
            $riskLevel = 'low';
            $riskScore = 30;
        }

        return [
            'risk_level' => $riskLevel,
            'risk_score' => min(100, $riskScore),
            'overrun_percentage' => $overrunPercentage,
            'overrun_amount' => $prediction['overrun_amount'],
            'predicted_cost' => $prediction['predicted_cost'],
            'recommendations' => $this->getCostRecommendations($riskLevel, $overrunPercentage),
        ];
    }

    /**
     * Tổng hợp phân tích dự đoán
     */
    public function getPredictiveAnalysis(Project $project): array
    {
        $completionPrediction = $this->predictCompletionDate($project);
        $costPrediction = $this->predictFinalCost($project);
        $delayRisk = $this->analyzeDelayRisk($project);
        $costRisk = $this->analyzeCostOverrunRisk($project);

        // Tính overall risk
        $overallRiskScore = ($delayRisk['risk_score'] + $costRisk['risk_score']) / 2;
        $overallRiskLevel = 'low';
        if ($overallRiskScore >= 70) {
            $overallRiskLevel = 'critical';
        } elseif ($overallRiskScore >= 50) {
            $overallRiskLevel = 'high';
        } elseif ($overallRiskScore >= 30) {
            $overallRiskLevel = 'medium';
        }

        return [
            'overall_risk_level' => $overallRiskLevel,
            'overall_risk_score' => round($overallRiskScore, 2),
            'completion_prediction' => $completionPrediction,
            'cost_prediction' => $costPrediction,
            'delay_risk' => $delayRisk,
            'cost_risk' => $costRisk,
            'alerts' => $this->generateAlerts($delayRisk, $costRisk),
        ];
    }

    protected function getDelayRecommendations(string $riskLevel, int $delayDays): array
    {
        $recommendations = [];

        if ($riskLevel === 'critical' || $delayDays > 30) {
            $recommendations[] = 'Cần điều chỉnh kế hoạch ngay lập tức';
            $recommendations[] = 'Xem xét tăng nguồn lực hoặc mở rộng thời gian';
        } elseif ($riskLevel === 'high' || $delayDays > 14) {
            $recommendations[] = 'Tăng tốc độ thi công các hạng mục quan trọng';
            $recommendations[] = 'Ưu tiên các task trên critical path';
        } elseif ($riskLevel === 'medium' || $delayDays > 7) {
            $recommendations[] = 'Theo dõi sát tiến độ và điều chỉnh kịp thời';
        }

        return $recommendations;
    }

    protected function getCostRecommendations(string $riskLevel, float $overrunPercentage): array
    {
        $recommendations = [];

        if ($riskLevel === 'critical' || $overrunPercentage > 20) {
            $recommendations[] = 'Cần xem xét lại ngân sách và tối ưu chi phí';
            $recommendations[] = 'Đánh giá lại các khoản chi phí không cần thiết';
        } elseif ($riskLevel === 'high' || $overrunPercentage > 10) {
            $recommendations[] = 'Kiểm soát chặt chẽ chi phí phát sinh';
            $recommendations[] = 'Xem xét thương lượng lại với nhà thầu phụ';
        } elseif ($riskLevel === 'medium' || $overrunPercentage > 5) {
            $recommendations[] = 'Theo dõi sát chi phí và ngân sách';
        }

        return $recommendations;
    }

    protected function generateAlerts(array $delayRisk, array $costRisk): array
    {
        $alerts = [];

        if ($delayRisk['risk_level'] === 'critical' || $delayRisk['risk_level'] === 'high') {
            $alerts[] = [
                'type' => 'delay',
                'severity' => $delayRisk['risk_level'],
                'message' => "Dự án có nguy cơ chậm tiến độ {$delayRisk['delay_days']} ngày",
            ];
        }

        if ($costRisk['risk_level'] === 'critical' || $costRisk['risk_level'] === 'high') {
            $alerts[] = [
                'type' => 'cost',
                'severity' => $costRisk['risk_level'],
                'message' => "Dự án có nguy cơ vượt ngân sách {$costRisk['overrun_percentage']}%",
            ];
        }

        return $alerts;
    }
}

