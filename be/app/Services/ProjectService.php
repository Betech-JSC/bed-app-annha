<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\Contract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectService
{
    protected $financialCalculationService;

    public function __construct(FinancialCalculationService $financialCalculationService)
    {
        $this->financialCalculationService = $financialCalculationService;
    }
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
     * Sử dụng FinancialCalculationService để đảm bảo tính nhất quán
     */
    public function calculateTotalCosts(Project $project): array
    {
        return $this->financialCalculationService->calculateTotalCosts($project);
    }

    /**
     * Kiểm tra tính nhất quán của tính toán chi phí
     * 
     * @param Project $project
     * @return array
     */
    public function validateCostCalculation(Project $project): array
    {
        return $this->financialCalculationService->validateCalculation($project);
    }

    /**
     * Tính lợi nhuận dự án
     * Sử dụng FinancialCalculationService để đảm bảo tính nhất quán
     */
    public function calculateProfit(Project $project): array
    {
        $result = $this->financialCalculationService->calculateProfit($project);
        
        // Validate calculation và log warnings
        $validation = $this->validateCostCalculation($project);
        if (!empty($validation['warnings'])) {
            Log::warning("Cost calculation warnings for project {$project->id}", [
                'project_id' => $project->id,
                'warnings' => $validation['warnings'],
            ]);
        }
        
        if (!empty($validation['errors'])) {
            Log::error("Cost calculation errors for project {$project->id}", [
                'project_id' => $project->id,
                'errors' => $validation['errors'],
            ]);
        }

        return $result;
    }
}
