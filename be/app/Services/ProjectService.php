<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\Contract;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    /**
     * Tạo payment schedule tự động từ hợp đồng
     */
    public function createPaymentSchedule(Project $project, array $paymentPlan): array
    {
        $contract = $project->contract;

        if (!$contract || $contract->status !== 'approved') {
            throw new \Exception('Hợp đồng chưa được duyệt.');
        }

        $payments = [];
        $totalAmount = 0;

        try {
            DB::beginTransaction();

            foreach ($paymentPlan as $index => $plan) {
                $paymentNumber = $index + 1;
                $amount = $plan['amount'] ?? ($contract->contract_value / count($paymentPlan));
                $dueDate = $plan['due_date'] ?? now()->addDays(30 * $paymentNumber)->toDateString();

                $payment = ProjectPayment::create([
                    'project_id' => $project->id,
                    'contract_id' => $contract->id,
                    'payment_number' => $paymentNumber,
                    'amount' => $amount,
                    'due_date' => $dueDate,
                    'status' => 'pending',
                ]);

                $payments[] = $payment;
                $totalAmount += $amount;
            }

            // Validate total matches contract value
            if (abs($totalAmount - $contract->contract_value) > 0.01) {
                throw new \Exception('Tổng số tiền các đợt thanh toán phải bằng giá trị hợp đồng.');
            }

            DB::commit();

            return $payments;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Tính tổng chi phí dự án
     */
    public function calculateTotalCosts(Project $project): array
    {
        $contractValue = $project->contract?->contract_value ?? 0;
        $additionalCosts = $project->additionalCosts()
            ->where('status', 'approved')
            ->sum('amount');
        $subcontractorCosts = $project->subcontractors()->sum('total_quote');

        // Chi phí nhân công từ Payroll (đã approved)
        $payrollCosts = $project->payrolls()
            ->where('status', 'approved')
            ->sum('net_salary');

        // Chi phí nhân công từ TimeTracking (đã tạo Cost record)
        // Lưu ý: Cost từ TimeTracking đã được tạo tự động khi TimeTracking được approve
        $timeTrackingCosts = $project->costs()
            ->whereNotNull('time_tracking_id')
            ->where('status', 'approved')
            ->sum('amount');

        // Chi phí từ Payroll đã tạo Cost record (tránh double counting)
        // Nếu Payroll đã tạo Cost, thì chỉ tính Cost, không tính Payroll nữa
        $payrollCostsFromCosts = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        // Nếu Payroll đã tạo Cost record, thì chỉ tính Cost
        // Nếu chưa, thì tính Payroll trực tiếp
        $actualPayrollCosts = $payrollCostsFromCosts > 0 
            ? $payrollCostsFromCosts 
            : $payrollCosts;

        // Thưởng từ Bonus (đã approved)
        $bonusCosts = $project->bonuses()
            ->where('status', 'approved')
            ->sum('amount');

        // Chi phí khác từ Cost (không phải từ Payroll hoặc TimeTracking)
        $otherCosts = $project->costs()
            ->whereNull('time_tracking_id')
            ->whereNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        return [
            'contract_value' => $contractValue,
            'additional_costs' => $additionalCosts,
            'subcontractor_costs' => $subcontractorCosts,
            'payroll_costs' => $actualPayrollCosts,
            'time_tracking_costs' => $timeTrackingCosts,
            'bonus_costs' => $bonusCosts,
            'other_costs' => $otherCosts,
            'total' => $contractValue 
                + $additionalCosts 
                + $subcontractorCosts 
                + $actualPayrollCosts 
                + $timeTrackingCosts 
                + $bonusCosts
                + $otherCosts,
        ];
    }

    /**
     * Tính lợi nhuận dự án
     */
    public function calculateProfit(Project $project): array
    {
        $costs = $this->calculateTotalCosts($project);
        $totalPaid = $project->payments()
            ->where('status', 'paid')
            ->sum('amount');

        // Tính tổng chi phí (không bao gồm contract_value vì đó là doanh thu)
        $totalCosts = $costs['additional_costs'] 
            + $costs['subcontractor_costs']
            + $costs['payroll_costs']
            + $costs['time_tracking_costs']
            + $costs['bonus_costs']
            + $costs['other_costs'];

        // Lợi nhuận = Doanh thu - Tổng chi phí
        $profit = $costs['contract_value'] - $totalCosts;
        $profitMargin = $costs['contract_value'] > 0
            ? ($profit / $costs['contract_value']) * 100
            : 0;

        return [
            'revenue' => $costs['contract_value'],
            'total_costs' => $totalCosts,
            'cost_breakdown' => [
                'additional_costs' => $costs['additional_costs'],
                'subcontractor_costs' => $costs['subcontractor_costs'],
                'payroll_costs' => $costs['payroll_costs'],
                'time_tracking_costs' => $costs['time_tracking_costs'],
                'bonus_costs' => $costs['bonus_costs'],
                'other_costs' => $costs['other_costs'],
            ],
            'profit' => $profit,
            'profit_margin' => round($profitMargin, 2),
            'total_paid' => $totalPaid,
            'remaining' => $costs['contract_value'] - $totalPaid,
        ];
    }
}
