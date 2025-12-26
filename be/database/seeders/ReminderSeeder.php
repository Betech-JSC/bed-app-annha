<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Models\Reminder;
use Illuminate\Database\Seeder;

class ReminderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::limit(10)->get();
        $projects = Project::limit(3)->get();
        $managers = User::whereIn('role', ['manager', 'admin'])->get();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        // Sử dụng đúng enum values từ migration: payment_due, deadline, maintenance, contract_expiry, leave_balance, custom
        $reminderTypes = ['deadline', 'custom', 'payment_due', 'maintenance'];

        $reminders = [];

        // Tạo reminders cho users - chỉ tạo cho users được gán vào projects
        foreach ($users->take(5) as $user) {
            // Tìm project mà user được gán
            $userProject = ProjectPersonnel::where('user_id', $user->id)
                ->with('project')
                ->first();

            $project = $userProject?->project ?? $projects->random();

            // Reminder về deadline
            $reminderDate = now()->addDays(rand(1, 7));
            $reminders[] = [
                'user_id' => $user->id,
                'title' => 'Nhắc nhở deadline dự án: ' . ($project->name ?? 'Dự án'),
                'body' => 'Dự án sắp đến hạn, cần hoàn thành các công việc còn lại',
                'reminder_type' => 'deadline',
                'reminder_date' => $reminderDate,
                'due_date' => $project->end_date ?? $reminderDate->copy()->addDays(7),
                'is_recurring' => false,
                'is_read' => false,
                'status' => 'pending',
                'remindable_type' => Project::class,
                'remindable_id' => $project->id ?? null,
                'created_by' => $managers->first()?->id ?? $user->id,
            ];

            // Reminder về meeting (dùng custom type)
            $reminderDate2 = now()->addDays(rand(1, 3));
            $reminders[] = [
                'user_id' => $user->id,
                'title' => 'Họp dự án tuần này',
                'body' => 'Cuộc họp đánh giá tiến độ dự án vào thứ 6 hàng tuần',
                'reminder_type' => 'custom',
                'reminder_date' => $reminderDate2,
                'due_date' => $reminderDate2->copy()->addDays(1),
                'is_recurring' => true,
                'recurrence_pattern' => 'weekly',
                'recurrence_interval' => 1,
                'next_reminder_date' => now()->addWeek(),
                'is_read' => false,
                'status' => 'pending',
                'remindable_type' => Project::class,
                'remindable_id' => $project->id ?? null,
                'created_by' => $managers->first()?->id ?? $user->id,
            ];

            // Reminder về payment due
            $reminderDate3 = now()->addDays(rand(1, 5));
            $reminders[] = [
                'user_id' => $user->id,
                'title' => 'Nhắc nhở thanh toán',
                'body' => 'Cần thanh toán các khoản phí dự án trước thứ 2',
                'reminder_type' => 'payment_due',
                'reminder_date' => $reminderDate3,
                'due_date' => $reminderDate3->copy()->addDays(3),
                'is_recurring' => true,
                'recurrence_pattern' => 'weekly',
                'recurrence_interval' => 1,
                'next_reminder_date' => now()->addWeek(),
                'is_read' => false,
                'status' => 'pending',
                'remindable_type' => Project::class,
                'remindable_id' => $project->id ?? null,
                'created_by' => $managers->first()?->id ?? $user->id,
            ];
        }

        foreach ($reminders as $reminder) {
            Reminder::create($reminder);
        }

        $this->command->info('Đã tạo ' . count($reminders) . ' nhắc nhở.');
    }
}
