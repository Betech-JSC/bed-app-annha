<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\EmploymentContract;
use App\Models\Department;
use Illuminate\Database\Seeder;

class EmploymentContractSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereIn('role', ['employee', 'technician', 'supervisor', 'accountant'])->limit(10)->get();
        $managers = User::whereIn('role', ['manager', 'admin'])->get();
        $departments = Department::all();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        $contractTypes = ['probation', 'fixed_term', 'indefinite', 'part_time'];
        $salaries = [8000000, 10000000, 12000000, 15000000, 20000000];

        // Gán department cho users chưa có
        foreach ($users as $index => $user) {
            if (!$user->department_id && $departments->isNotEmpty()) {
                $user->department_id = $departments->get($index % $departments->count())->id;
                $user->save();
            }
        }

        foreach ($users as $user) {
            $contractType = $contractTypes[array_rand($contractTypes)];
            $baseSalary = $salaries[array_rand($salaries)];
            $startDate = now()->subMonths(rand(6, 24));
            
            $endDate = null;
            if ($contractType === 'fixed_term') {
                $endDate = $startDate->copy()->addYears(2);
            } elseif ($contractType === 'probation') {
                $endDate = $startDate->copy()->addMonths(2);
            }

            EmploymentContract::create([
                'user_id' => $user->id,
                'contract_type' => $contractType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'base_salary' => $baseSalary,
                'job_title' => $this->getJobTitle($user->role),
                'job_description' => $this->getJobDescription($user->role),
                'benefits' => json_encode([
                    'Bảo hiểm xã hội',
                    'Bảo hiểm y tế',
                    'Bảo hiểm thất nghiệp',
                    'Phụ cấp ăn trưa',
                    'Phụ cấp đi lại',
                ]),
                'status' => $endDate && $endDate->isPast() ? 'expired' : 'active',
                'created_by' => $managers->first()?->id ?? $user->id,
            ]);
        }

        $this->command->info('Đã tạo ' . $users->count() . ' hợp đồng lao động.');
    }

    private function getJobTitle(string $role): string
    {
        return match($role) {
            'employee' => 'Nhân viên',
            'technician' => 'Kỹ thuật viên',
            'supervisor' => 'Giám sát',
            'accountant' => 'Kế toán',
            default => 'Nhân viên',
        };
    }

    private function getJobDescription(string $role): string
    {
        return match($role) {
            'employee' => 'Thực hiện các công việc được giao theo yêu cầu của quản lý',
            'technician' => 'Chịu trách nhiệm về kỹ thuật, thiết kế và giám sát thi công',
            'supervisor' => 'Giám sát chất lượng và tiến độ thi công tại công trường',
            'accountant' => 'Quản lý tài chính, kế toán và ngân sách dự án',
            default => 'Thực hiện các công việc được giao',
        };
    }
}

