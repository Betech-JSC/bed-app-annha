<?php

namespace App\Services;

class TaxCalculationService
{
    // Giảm trừ gia cảnh (theo quy định VN 2024)
    const PERSONAL_DEDUCTION = 11000000; // 11 triệu/tháng
    const DEPENDENT_DEDUCTION = 4400000; // 4.4 triệu/tháng/người phụ thuộc

    // Bậc thuế TNCN (theo quy định VN 2024)
    const TAX_BRACKETS = [
        ['min' => 0, 'max' => 5000000, 'rate' => 0.05],      // Bậc 1: 0-5 triệu: 5%
        ['min' => 5000000, 'max' => 10000000, 'rate' => 0.10], // Bậc 2: 5-10 triệu: 10%
        ['min' => 10000000, 'max' => 18000000, 'rate' => 0.15], // Bậc 3: 10-18 triệu: 15%
        ['min' => 18000000, 'max' => 32000000, 'rate' => 0.20], // Bậc 4: 18-32 triệu: 20%
        ['min' => 32000000, 'max' => 52000000, 'rate' => 0.25], // Bậc 5: 32-52 triệu: 25%
        ['min' => 52000000, 'max' => 80000000, 'rate' => 0.30], // Bậc 6: 52-80 triệu: 30%
        ['min' => 80000000, 'max' => PHP_FLOAT_MAX, 'rate' => 0.35], // Bậc 7: >80 triệu: 35%
    ];

    /**
     * Tính thuế TNCN
     * 
     * @param float $grossSalary Tổng thu nhập trước thuế
     * @param int $dependents Số người phụ thuộc
     * @return array
     */
    public function calculateTax(float $grossSalary, int $dependents = 0): array
    {
        // Tính giảm trừ gia cảnh
        $personalDeduction = self::PERSONAL_DEDUCTION;
        $dependentDeduction = $dependents * self::DEPENDENT_DEDUCTION;
        $totalDeduction = $personalDeduction + $dependentDeduction;

        // Thu nhập chịu thuế = Tổng thu nhập - Giảm trừ gia cảnh
        $taxableIncome = max(0, $grossSalary - $totalDeduction);

        // Tính thuế theo bậc
        $tax = 0;
        $taxBreakdown = [];

        foreach (self::TAX_BRACKETS as $bracket) {
            if ($taxableIncome <= $bracket['min']) {
                break;
            }

            $taxableAmount = min($taxableIncome - $bracket['min'], $bracket['max'] - $bracket['min']);
            if ($taxableAmount > 0) {
                $bracketTax = $taxableAmount * $bracket['rate'];
                $tax += $bracketTax;
                
                $taxBreakdown[] = [
                    'bracket' => "Bậc " . (array_search($bracket, self::TAX_BRACKETS) + 1),
                    'range' => number_format($bracket['min'] / 1000000, 1) . ' - ' . 
                              ($bracket['max'] === PHP_FLOAT_MAX ? '∞' : number_format($bracket['max'] / 1000000, 1)) . ' triệu',
                    'taxable_amount' => round($taxableAmount, 2),
                    'rate' => $bracket['rate'] * 100,
                    'tax' => round($bracketTax, 2),
                ];
            }
        }

        return [
            'gross_salary' => round($grossSalary, 2),
            'personal_deduction' => $personalDeduction,
            'dependent_deduction' => $dependentDeduction,
            'dependents_count' => $dependents,
            'total_deduction' => $totalDeduction,
            'taxable_income' => round($taxableIncome, 2),
            'tax' => round($tax, 2),
            'tax_breakdown' => $taxBreakdown,
        ];
    }

    /**
     * Tính thuế đơn giản (không có breakdown)
     * 
     * @param float $grossSalary
     * @param int $dependents
     * @return float
     */
    public function calculateTaxAmount(float $grossSalary, int $dependents = 0): float
    {
        $result = $this->calculateTax($grossSalary, $dependents);
        return $result['tax'];
    }
}

