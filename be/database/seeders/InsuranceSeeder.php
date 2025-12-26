<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\EmployeeInsurance;
use App\Models\EmployeeBenefit;
use Illuminate\Database\Seeder;

class InsuranceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereIn('role', ['employee', 'technician', 'supervisor', 'accountant'])->limit(10)->get();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        // Tạo bảo hiểm cho mỗi user
        foreach ($users as $user) {
            $baseSalary = rand(8000000, 20000000);
            
            EmployeeInsurance::create([
                'user_id' => $user->id,
                'social_insurance_number' => 'BHXH-' . str_pad($user->id, 10, '0', STR_PAD_LEFT),
                'health_insurance_number' => 'BHYT-' . str_pad($user->id, 10, '0', STR_PAD_LEFT),
                'unemployment_insurance_number' => 'BHTN-' . str_pad($user->id, 10, '0', STR_PAD_LEFT),
                'insurance_start_date' => now()->subMonths(rand(6, 24)),
                'insurance_end_date' => null,
                'social_insurance_rate' => 8.0,
                'health_insurance_rate' => 1.5,
                'unemployment_insurance_rate' => 1.0,
                'base_salary_for_insurance' => $baseSalary,
                'status' => 'active',
            ]);

            // Tạo phúc lợi cho mỗi user
            $benefits = [
                [
                    'user_id' => $user->id,
                    'name' => 'Phụ cấp ăn trưa',
                    'benefit_type' => 'Allowance',
                    'description' => 'Phụ cấp ăn trưa hàng tháng',
                    'amount' => 730000,
                    'calculation_type' => 'fixed',
                    'start_date' => now()->subMonths(6),
                    'end_date' => null,
                    'status' => 'active',
                ],
                [
                    'user_id' => $user->id,
                    'name' => 'Phụ cấp đi lại',
                    'benefit_type' => 'Allowance',
                    'description' => 'Phụ cấp đi lại hàng tháng',
                    'amount' => 500000,
                    'calculation_type' => 'fixed',
                    'start_date' => now()->subMonths(6),
                    'end_date' => null,
                    'status' => 'active',
                ],
                [
                    'user_id' => $user->id,
                    'name' => 'Thưởng hiệu suất',
                    'benefit_type' => 'Bonus',
                    'description' => 'Thưởng hiệu suất làm việc',
                    'amount' => 1000000,
                    'calculation_type' => 'fixed',
                    'start_date' => now()->subMonths(3),
                    'end_date' => null,
                    'status' => 'active',
                ],
            ];

            foreach ($benefits as $benefit) {
                EmployeeBenefit::create($benefit);
            }
        }

        $this->command->info('Đã tạo bảo hiểm và phúc lợi cho ' . $users->count() . ' users.');
    }
}

