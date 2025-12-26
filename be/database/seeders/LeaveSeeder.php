<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\Project;
use Illuminate\Database\Seeder;

class LeaveSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereIn('role', ['employee', 'technician', 'supervisor'])->limit(10)->get();
        $projects = Project::limit(3)->get();
        $managers = User::whereIn('role', ['manager', 'admin'])->get();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        if ($managers->isEmpty()) {
            $this->command->warn('Chưa có managers để duyệt nghỉ phép.');
            return;
        }

        $currentYear = now()->year;

        // Tạo leave balance cho mỗi user
        foreach ($users as $user) {
            LeaveBalance::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'leave_type' => 'annual',
                    'year' => $currentYear,
                ],
                [
                    'total_days' => 12,
                    'used_days' => 0,
                    'remaining_days' => 12,
                ]
            );

            LeaveBalance::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'leave_type' => 'sick',
                    'year' => $currentYear,
                ],
                [
                    'total_days' => 5,
                    'used_days' => 0,
                    'remaining_days' => 5,
                ]
            );
        }

        // Tạo leave requests
        $leaveRequests = [];

        foreach ($users->take(5) as $user) {
            // Nghỉ phép năm đã duyệt
            $leaveRequests[] = [
                'user_id' => $user->id,
                'project_id' => $projects->random()->id ?? null,
                'leave_type' => 'annual',
                'start_date' => now()->subDays(10),
                'end_date' => now()->subDays(8),
                'days' => 3,
                'reason' => 'Nghỉ phép năm',
                'status' => 'approved',
                'approved_by' => $managers->random()->id,
                'approved_at' => now()->subDays(11),
                'created_by' => $user->id,
            ];

            // Nghỉ ốm đang chờ duyệt
            $leaveRequests[] = [
                'user_id' => $user->id,
                'project_id' => $projects->random()->id ?? null,
                'leave_type' => 'sick',
                'start_date' => now()->addDays(2),
                'end_date' => now()->addDays(2),
                'days' => 1,
                'reason' => 'Ốm, cần nghỉ để điều trị',
                'status' => 'pending',
                'created_by' => $user->id,
            ];
        }

        foreach ($leaveRequests as $request) {
            $leaveRequest = LeaveRequest::create($request);
            
            // Cập nhật leave balance sau khi tạo leave request
            if ($leaveRequest->status === 'approved') {
                $balance = LeaveBalance::where('user_id', $leaveRequest->user_id)
                    ->where('leave_type', $leaveRequest->leave_type)
                    ->where('year', now()->year)
                    ->first();
                
                if ($balance) {
                    $balance->used_days += $leaveRequest->days;
                    $balance->remaining_days = $balance->total_days - $balance->used_days;
                    $balance->save();
                }
            }
        }

        $this->command->info('Đã tạo ' . count($leaveRequests) . ' đơn nghỉ phép và cập nhật leave balance.');
    }
}

