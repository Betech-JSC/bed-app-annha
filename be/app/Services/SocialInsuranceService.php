<?php

namespace App\Services;

class SocialInsuranceService
{
    // Tỷ lệ đóng bảo hiểm (theo quy định VN 2024)
    // Người lao động
    const EMPLOYEE_SOCIAL_INSURANCE_RATE = 0.08;      // 8% BHXH
    const EMPLOYEE_HEALTH_INSURANCE_RATE = 0.015;     // 1.5% BHYT
    const EMPLOYEE_UNEMPLOYMENT_INSURANCE_RATE = 0.01; // 1% BHTN

    // Người sử dụng lao động
    const EMPLOYER_SOCIAL_INSURANCE_RATE = 0.175;      // 17.5% BHXH
    const EMPLOYER_HEALTH_INSURANCE_RATE = 0.03;       // 3% BHYT
    const EMPLOYER_UNEMPLOYMENT_INSURANCE_RATE = 0.01; // 1% BHTN

    // Mức lương đóng BH tối đa (theo quy định VN 2024)
    // Có thể cấu hình theo từng năm
    const MAX_INSURANCE_SALARY = 36000000; // 36 triệu/tháng (có thể thay đổi theo quy định)

    /**
     * Tính các khoản bảo hiểm
     * 
     * @param float $grossSalary Tổng thu nhập
     * @param bool $includeEmployer Tính cả phần người sử dụng lao động đóng
     * @return array
     */
    public function calculateSocialInsurance(float $grossSalary, bool $includeEmployer = false): array
    {
        // Mức lương đóng BH = min(grossSalary, MAX_INSURANCE_SALARY)
        $insuranceSalary = min($grossSalary, self::MAX_INSURANCE_SALARY);

        // Tính các khoản bảo hiểm người lao động đóng
        $employeeSocialInsurance = $insuranceSalary * self::EMPLOYEE_SOCIAL_INSURANCE_RATE;
        $employeeHealthInsurance = $insuranceSalary * self::EMPLOYEE_HEALTH_INSURANCE_RATE;
        $employeeUnemploymentInsurance = $insuranceSalary * self::EMPLOYEE_UNEMPLOYMENT_INSURANCE_RATE;

        $employeeTotal = $employeeSocialInsurance + $employeeHealthInsurance + $employeeUnemploymentInsurance;

        $result = [
            'insurance_salary' => round($insuranceSalary, 2),
            'employee' => [
                'social_insurance' => round($employeeSocialInsurance, 2),
                'health_insurance' => round($employeeHealthInsurance, 2),
                'unemployment_insurance' => round($employeeUnemploymentInsurance, 2),
                'total' => round($employeeTotal, 2),
            ],
        ];

        // Tính phần người sử dụng lao động đóng (nếu cần)
        if ($includeEmployer) {
            $employerSocialInsurance = $insuranceSalary * self::EMPLOYER_SOCIAL_INSURANCE_RATE;
            $employerHealthInsurance = $insuranceSalary * self::EMPLOYER_HEALTH_INSURANCE_RATE;
            $employerUnemploymentInsurance = $insuranceSalary * self::EMPLOYER_UNEMPLOYMENT_INSURANCE_RATE;
            $employerTotal = $employerSocialInsurance + $employerHealthInsurance + $employerUnemploymentInsurance;

            $result['employer'] = [
                'social_insurance' => round($employerSocialInsurance, 2),
                'health_insurance' => round($employerHealthInsurance, 2),
                'unemployment_insurance' => round($employerUnemploymentInsurance, 2),
                'total' => round($employerTotal, 2),
            ];
            $result['total_cost'] = round($employeeTotal + $employerTotal, 2);
        }

        return $result;
    }

    /**
     * Tính tổng các khoản bảo hiểm người lao động đóng
     * 
     * @param float $grossSalary
     * @return float
     */
    public function calculateEmployeeInsuranceTotal(float $grossSalary): float
    {
        $result = $this->calculateSocialInsurance($grossSalary);
        return $result['employee']['total'];
    }
}

