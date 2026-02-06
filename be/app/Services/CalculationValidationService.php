<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Cost;
use Illuminate\Support\Facades\Log;

class CalculationValidationService
{
    /**
     * Kiểm tra tính toán chi phí dự án
     * 
     * @param Project $project
     * @return array
     */
    public function validateCostCalculation(Project $project): array
    {
        $errors = [];
        $warnings = [];

        // 1. Kiểm tra Payroll costs (removed - HR module deleted)
        $payrollCostsFromCosts = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');



        // 3. Kiểm tra tính nhất quán: Tổng chi phí từ các nguồn
        $totalCostsFromSources =
            $project->additionalCosts()->where('status', 'approved')->sum('amount') +
            $project->subcontractors()->sum('total_quote') +
            // Bonuses removed - HR module deleted
            $project->costs()
            ->where('status', 'approved')
            ->sum('amount');

        $totalCostsFromCostsTable = $project->costs()
            ->where('status', 'approved')
            ->sum('amount');

        // Cho phép sai số nhỏ do làm tròn
        $difference = abs($totalCostsFromSources - $totalCostsFromCostsTable);
        if ($difference > 1000) { // Cho phép sai số 1000 VNĐ
            $warnings[] = [
                'type' => 'cost_calculation_mismatch',
                'message' => 'Tổng chi phí từ các nguồn không khớp với tổng Cost records.',
                'total_from_sources' => $totalCostsFromSources,
                'total_from_costs_table' => $totalCostsFromCostsTable,
                'difference' => $difference,
            ];
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Kiểm tra tính toán doanh thu
     * 
     * @param Project $project
     * @return array
     */
    public function validateRevenueCalculation(Project $project): array
    {
        $errors = [];
        $warnings = [];

        $contract = $project->contract;
        if (!$contract || $contract->status !== 'approved') {
            return [
                'is_valid' => true,
                'errors' => [],
                'warnings' => [
                    [
                        'type' => 'no_approved_contract',
                        'message' => 'Dự án chưa có hợp đồng được duyệt.',
                    ],
                ],
            ];
        }

        // Kiểm tra: Doanh thu từ contract = tổng payment schedule
        $totalPaymentSchedule = $project->payments()->sum('amount');
        $contractValue = $contract->contract_value;

        $difference = abs($totalPaymentSchedule - $contractValue);
        if ($difference > 0.01) {
            $warnings[] = [
                'type' => 'payment_schedule_mismatch',
                'message' => 'Tổng payment schedule không khớp với giá trị hợp đồng.',
                'contract_value' => $contractValue,
                'total_payment_schedule' => $totalPaymentSchedule,
                'difference' => $difference,
            ];
        }

        // Kiểm tra: Tổng thanh toán đã trả <= Tổng payment schedule
        $totalPaid = $project->payments()->where('status', 'paid')->sum('amount');
        if ($totalPaid > $totalPaymentSchedule + 0.01) {
            $errors[] = [
                'type' => 'over_payment',
                'message' => 'Tổng thanh toán đã trả vượt quá tổng payment schedule.',
                'total_paid' => $totalPaid,
                'total_payment_schedule' => $totalPaymentSchedule,
            ];
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }
}
