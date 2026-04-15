<?php

namespace App\Services;

use App\Models\User;
use App\Models\Role;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UserStatisticsService
{
    /**
     * Lấy dữ liệu tổng quan cho HR Dashboard
     * 
     * @param int $months Số tháng để thống kê
     * @return array
     */
    public function getHrDashboardData(int $months = 6): array
    {
        $endDate = now();
        $startDate = now()->subMonths($months - 1)->startOfMonth();

        // 1. Biểu đồ số giờ làm việc theo tháng (Removed TimeTracking logic - placeholder)
        $monthlyHours = [];
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $monthlyHours[] = [
                'month' => $currentDate->format('M/Y'),
                'hours' => 0,
            ];
            $currentDate->addMonth();
        }

        // 2. Biểu đồ phân bố nhân viên theo vai trò
        $roleDistribution = [];
        $roles = Role::withCount('users')->get();
        foreach ($roles as $role) {
            if ($role->users_count > 0) {
                $roleDistribution[] = [
                    'role' => $role->name,
                    'count' => $role->users_count,
                ];
            }
        }

        // 3. Biểu đồ lương theo tháng (Payroll removed - placeholder)
        $monthlyPayroll = [];
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $monthlyPayroll[] = [
                'month' => $currentDate->format('M/Y'),
                'amount' => 0,
            ];
            $currentDate->addMonth();
        }

        // Stats tổng quan
        $stats = [
            'pending_time_tracking' => 0,
            'pending_payroll' => 0,
            'pending_bonuses' => 0,
            'total_employees' => User::whereNull('deleted_at')->count(),
        ];

        return [
            'stats' => $stats,
            'charts' => [
                'monthly_hours' => $monthlyHours,
                'role_distribution' => $roleDistribution,
                'monthly_payroll' => $monthlyPayroll,
                'time_tracking_status' => [
                    ['status' => 'Đã duyệt', 'count' => 0],
                    ['status' => 'Chờ duyệt', 'count' => 0],
                    ['status' => 'Từ chối', 'count' => 0],
                ]
            ],
        ];
    }

    /**
     * Lấy thống kê chi tiết cho một nhân viên
     * 
     * @param User $user
     * @param int $month
     * @param int $year
     * @return array
     */
    public function getEmployeeStats(User $user, int $month, int $year): array
    {
        return [
            'employee' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'time_tracking' => [
                'total_hours' => 0,
                'total_days' => 0,
            ],
            'payroll' => [
                'total_salary' => 0,
            ],
            'bonuses' => [
                'total' => 0,
                'count' => 0,
            ],
        ];
    }
}
