<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RevenueAllocationService
{
    /**
     * Phân bổ doanh thu theo payment schedule
     * 
     * @param Project $project
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return float
     */
    public function allocateByPaymentSchedule(Project $project, Carbon $startDate, Carbon $endDate): float
    {
        $contract = $project->contract;
        if (!$contract || $contract->status !== 'approved') {
            return 0;
        }

        // Lấy các payment trong khoảng thời gian
        $payments = $project->payments()
            ->where(function ($q) use ($startDate, $endDate) {
                // Payment có due_date trong khoảng thời gian
                $q->whereBetween('due_date', [$startDate, $endDate])
                    // Hoặc payment đã được thanh toán trong khoảng thời gian
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->where('status', 'paid')
                            ->whereNotNull('paid_date')
                            ->whereBetween('paid_date', [$startDate, $endDate]);
                    });
            })
            ->get();

        // Tính tổng doanh thu từ các payment trong khoảng thời gian
        $allocatedRevenue = $payments->sum('amount');

        return (float) $allocatedRevenue;
    }

    /**
     * Phân bổ doanh thu theo milestone completion
     * 
     * @param Project $project
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return float
     */
    public function allocateByMilestone(Project $project, Carbon $startDate, Carbon $endDate): float
    {
        $contract = $project->contract;
        if (!$contract || $contract->status !== 'approved') {
            return 0;
        }

        // TODO: Implement khi có milestone system
        // Hiện tại trả về 0, sẽ được implement sau khi có milestone tracking
        Log::info("allocateByMilestone called but not yet implemented", [
            'project_id' => $project->id,
        ]);

        return 0;
    }

    /**
     * Phân bổ doanh thu theo % hoàn thành dự án
     * 
     * @param Project $project
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return float
     */
    public function allocateByProgress(Project $project, Carbon $startDate, Carbon $endDate): float
    {
        $contract = $project->contract;
        if (!$contract || $contract->status !== 'approved') {
            return 0;
        }

        // Lấy progress của dự án
        $progress = $project->progress;
        if (!$progress) {
            return 0;
        }

        $contractValue = $contract->contract_value;
        $completionPercentage = $progress->completion_percentage ?? 0;

        // Tính doanh thu dựa trên % hoàn thành
        // Giả định phân bổ đều theo thời gian trong khoảng
        $daysInPeriod = $startDate->diffInDays($endDate) + 1;
        $projectStartDate = $project->start_date ?? now();
        $projectEndDate = $project->end_date ?? $projectStartDate->copy()->addMonths(12);
        $totalProjectDays = $projectStartDate->diffInDays($projectEndDate) + 1;

        if ($totalProjectDays <= 0) {
            return 0;
        }

        // Phân bổ theo tỷ lệ thời gian trong khoảng / tổng thời gian dự án
        $timeRatio = min(1, $daysInPeriod / $totalProjectDays);
        $allocatedRevenue = $contractValue * ($completionPercentage / 100) * $timeRatio;

        return (float) $allocatedRevenue;
    }

    /**
     * Phân bổ doanh thu theo tháng dựa trên payment schedule
     * 
     * @param Project $project
     * @param int $year
     * @param int $month
     * @return float
     */
    public function allocateByMonth(Project $project, int $year, int $month): float
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        return $this->allocateByPaymentSchedule($project, $startDate, $endDate);
    }

    /**
     * Phân bổ doanh thu theo nhiều tháng
     * 
     * @param Project $project
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array Array of monthly allocations
     */
    public function allocateMonthly(Project $project, Carbon $startDate, Carbon $endDate): array
    {
        $monthlyAllocations = [];
        $current = $startDate->copy()->startOfMonth();

        while ($current->lte($endDate)) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();
            
            // Đảm bảo không vượt quá endDate
            if ($monthStart->lt($startDate)) {
                $monthStart = $startDate->copy();
            }
            if ($monthEnd->gt($endDate)) {
                $monthEnd = $endDate->copy();
            }

            $allocated = $this->allocateByPaymentSchedule($project, $monthStart, $monthEnd);
            
            $monthlyAllocations[] = [
                'period' => $current->format('Y-m'),
                'year' => $current->year,
                'month' => $current->month,
                'amount' => $allocated,
            ];

            $current->addMonth();
        }

        return $monthlyAllocations;
    }
}

