<?php

use App\Models\User;
use App\Models\Project;
use App\Models\Attendance;
use App\Models\EmployeeSalaryConfig;
use App\Models\Cost;
use App\Services\AttendanceService;
use Carbon\Carbon;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Tìm hoặc tạo dữ liệu mẫu
$user = User::first() ?? User::factory()->create();
$project = Project::first() ?? Project::factory()->create();
$admin = User::where('role', 'admin')->first() ?? $user;

echo "--- Testing Attendance to Cost Workflow ---\n";
echo "User: {$user->name} (#{$user->id})\n";
echo "Project: {$project->name} (#{$project->id})\n";

// 2. Tạo cấu hình lương (nếu chưa có hoặc tạo mới cho ngày hôm nay)
$config = EmployeeSalaryConfig::updateOrCreate(
    ['user_id' => $user->id, 'effective_from' => Carbon::today()->subDays(5)],
    [
        'salary_type' => 'hourly',
        'hourly_rate' => 100000, // 100k/giờ
        'overtime_rate' => 150000, // 150k/giờ OT
        'effective_to' => null,
    ]
);
echo "Salary Config: 100k/h, OT 150k/h\n";

// 3. Tạo bản ghi chấm công
$workDate = Carbon::today()->toDateString();
// Xóa bản ghi cũ nếu có để test sạch
Attendance::where('user_id', $user->id)->where('work_date', $workDate)->delete();

$attendance = Attendance::create([
    'user_id' => $user->id,
    'project_id' => $project->id,
    'work_date' => $workDate,
    'check_in' => '08:00:00',
    'check_out' => '18:00:00', // 10 tiếng làm việc
    'hours_worked' => 10,
    'overtime_hours' => 2, // 8h thường + 2h OT
    'status' => 'present',
]);
echo "Attendance Created: 10h worked (2h OT)\n";

// 4. Thực hiện Duyệt (Approve)
echo "Approving Attendance...\n";
$service = app(AttendanceService::class);
$service->approve($attendance, $admin);

// 5. Kiểm tra kết quả trong bảng Cost
$cost = Cost::where('attendance_id', $attendance->id)->first();

if ($cost) {
    echo "\nSUCCESS: Labor cost generated!\n";
    echo "Cost Name: {$cost->name}\n";
    echo "Amount: " . number_format($cost->amount, 0, ',', '.') . " VNĐ\n";
    echo "Expected: (8h * 100k) + (2h * 150k) = 1.100.000 VNĐ\n";
    echo "Description: {$cost->description}\n";
    echo "Status: {$cost->status}\n";
} else {
    echo "\nFAILED: No labor cost generated.\n";
}
