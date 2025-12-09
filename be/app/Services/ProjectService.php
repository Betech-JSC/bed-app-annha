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

        return [
            'contract_value' => $contractValue,
            'additional_costs' => $additionalCosts,
            'subcontractor_costs' => $subcontractorCosts,
            'total' => $contractValue + $additionalCosts + $subcontractorCosts,
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

        $profit = $costs['contract_value'] - $costs['subcontractor_costs'] - $costs['additional_costs'];
        $profitMargin = $costs['contract_value'] > 0
            ? ($profit / $costs['contract_value']) * 100
            : 0;

        return [
            'revenue' => $costs['contract_value'],
            'total_costs' => $costs['subcontractor_costs'] + $costs['additional_costs'],
            'profit' => $profit,
            'profit_margin' => round($profitMargin, 2),
            'total_paid' => $totalPaid,
            'remaining' => $costs['contract_value'] - $totalPaid,
        ];
    }
}
