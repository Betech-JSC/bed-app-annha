<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkSchedule;
use App\Models\Project;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class WorkScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo dữ liệu mẫu cho module lịch làm việc
     */
    public function run(): void
    {
        $this->command->info('Đang tạo dữ liệu mẫu cho module lịch làm việc...');

        // Lấy các employees
        $employees = User::whereHas('roles', function ($query) {
            $query->whereIn('name', ['employee', 'worker', 'staff']);
        })->orWhereDoesntHave('roles', function ($query) {
            $query->whereIn('name', ['admin', 'super_admin', 'hr_admin']);
        })->limit(10)->get();

        if ($employees->isEmpty()) {
            // Nếu không có employees, lấy một số users bất kỳ
            $employees = User::where('email', '!=', 'superadmin@skysend.com')
                ->where('email', '!=', 'hradmin@skysend.com')
                ->limit(5)
                ->get();
        }

        if ($employees->isEmpty()) {
            $this->command->warn('Không tìm thấy nhân viên nào. Vui lòng tạo users trước.');
            return;
        }

        // Lấy projects
        $projects = Project::all();

        if ($projects->isEmpty()) {
            $this->command->warn('Không tìm thấy dự án nào. Vui lòng tạo projects trước.');
            return;
        }

        $this->command->info("Tìm thấy {$employees->count()} nhân viên và {$projects->count()} dự án. Đang tạo lịch làm việc...");

        // Tạo lịch làm việc cho 3 tháng (1 tháng trước, tháng hiện tại, 1 tháng sau)
        for ($monthOffset = -1; $monthOffset <= 1; $monthOffset++) {
            $monthStart = now()->addMonths($monthOffset)->startOfMonth();
            $monthEnd = now()->addMonths($monthOffset)->endOfMonth();
            
            $this->command->info("Đang tạo lịch cho tháng: " . $monthStart->format('Y-m'));

            foreach ($employees as $employee) {
                // Tạo lịch làm việc cho mỗi nhân viên
                $this->createWorkSchedulesForEmployee($employee, $monthStart, $monthEnd, $projects);
            }
        }

        // Tạo các ngày lễ chung cho tất cả nhân viên
        $this->createHolidays($employees);

        $this->command->info('Đã tạo dữ liệu mẫu cho module lịch làm việc thành công!');
        $this->command->info("Tổng số work schedule records: " . WorkSchedule::count());
    }

    /**
     * Tạo lịch làm việc cho một nhân viên trong tháng
     */
    private function createWorkSchedulesForEmployee(
        User $employee,
        Carbon $monthStart,
        Carbon $monthEnd,
        $projects
    ): void {
        $current = $monthStart->copy();
        $workDaysCount = 0;
        $leaveDaysCount = 0;

        while ($current <= $monthEnd) {
            // Bỏ qua cuối tuần (thứ 7 và chủ nhật)
            if ($current->isWeekend()) {
                $current->addDay();
                continue;
            }

            $date = $current->copy();
            $dayOfWeek = $date->dayOfWeek;

            // 80% cơ hội có lịch làm việc
            if (rand(1, 10) <= 8) {
                // Tạo lịch làm việc
                $project = rand(1, 10) <= 7 ? $projects->random() : null; // 70% có project
                
                $startTime = $this->getStartTime($dayOfWeek);
                $endTime = $this->getEndTime($dayOfWeek);

                WorkSchedule::firstOrCreate(
                    [
                        'user_id' => $employee->id,
                        'date' => $date->toDateString(),
                        'start_time' => $startTime,
                    ],
                    [
                        'user_id' => $employee->id,
                        'project_id' => $project?->id,
                        'date' => $date->toDateString(),
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'type' => 'work',
                        'notes' => $project ? "Làm việc tại dự án {$project->name}" : null,
                    ]
                );
                $workDaysCount++;
            } elseif (rand(1, 10) <= 2) {
                // 20% cơ hội nghỉ phép (trong số 20% không làm việc)
                WorkSchedule::firstOrCreate(
                    [
                        'user_id' => $employee->id,
                        'date' => $date->toDateString(),
                        'type' => 'leave',
                    ],
                    [
                        'user_id' => $employee->id,
                        'project_id' => null,
                        'date' => $date->toDateString(),
                        'start_time' => '00:00:00',
                        'end_time' => '00:00:00',
                        'type' => 'leave',
                        'notes' => 'Nghỉ phép',
                    ]
                );
                $leaveDaysCount++;
            }

            // Một số ngày có tăng ca (sau giờ làm việc)
            if (rand(1, 10) <= 3 && $workDaysCount > 0) {
                $workSchedule = WorkSchedule::where('user_id', $employee->id)
                    ->where('date', $date->toDateString())
                    ->where('type', 'work')
                    ->first();

                if ($workSchedule) {
                    // Tạo lịch tăng ca
                    WorkSchedule::firstOrCreate(
                        [
                            'user_id' => $employee->id,
                            'date' => $date->toDateString(),
                            'start_time' => '17:30:00',
                            'type' => 'overtime',
                        ],
                        [
                            'user_id' => $employee->id,
                            'project_id' => $workSchedule->project_id,
                            'date' => $date->toDateString(),
                            'start_time' => '17:30:00',
                            'end_time' => $this->getOvertimeEndTime(),
                            'type' => 'overtime',
                            'notes' => 'Tăng ca',
                        ]
                    );
                }
            }

            $current->addDay();
        }
    }

    /**
     * Tạo các ngày lễ chung
     */
    private function createHolidays($employees): void
    {
        $currentYear = now()->year;
        $nextYear = $currentYear + 1;
        
        // Tạo ngày lễ cho năm hiện tại và năm sau
        $holidayDates = [];
        
        // Năm hiện tại
        $holidayDates[] = Carbon::create($currentYear, 1, 1); // Tết 1/1
        $holidayDates[] = Carbon::create($currentYear, 1, 2); // Tết 2/1
        $holidayDates[] = Carbon::create($currentYear, 4, 10); // Giỗ Tổ Hùng Vương
        $holidayDates[] = Carbon::create($currentYear, 4, 30); // Giải phóng miền Nam
        $holidayDates[] = Carbon::create($currentYear, 5, 1); // Quốc tế Lao động
        $holidayDates[] = Carbon::create($currentYear, 9, 2); // Quốc khánh
        
        // Năm sau
        $holidayDates[] = Carbon::create($nextYear, 1, 1); // Tết 1/1
        $holidayDates[] = Carbon::create($nextYear, 1, 2); // Tết 2/1
        $holidayDates[] = Carbon::create($nextYear, 4, 10); // Giỗ Tổ Hùng Vương
        $holidayDates[] = Carbon::create($nextYear, 4, 30); // Giải phóng miền Nam
        $holidayDates[] = Carbon::create($nextYear, 5, 1); // Quốc tế Lao động
        $holidayDates[] = Carbon::create($nextYear, 9, 2); // Quốc khánh

        foreach ($holidayDates as $holidayDate) {
            // Chỉ tạo nếu ngày lễ trong khoảng 3 tháng trước đến 6 tháng sau
            if ($holidayDate->lt(now()->subMonths(3)) || $holidayDate->gt(now()->addMonths(6))) {
                continue;
            }

            foreach ($employees as $employee) {
                WorkSchedule::firstOrCreate(
                    [
                        'user_id' => $employee->id,
                        'date' => $holidayDate->toDateString(),
                        'type' => 'holiday',
                    ],
                    [
                        'user_id' => $employee->id,
                        'project_id' => null,
                        'date' => $holidayDate->toDateString(),
                        'start_time' => '00:00:00',
                        'end_time' => '00:00:00',
                        'type' => 'holiday',
                        'notes' => $this->getHolidayName($holidayDate),
                    ]
                );
            }
        }
    }

    /**
     * Lấy giờ bắt đầu làm việc
     */
    private function getStartTime(int $dayOfWeek): string
    {
        // Thứ 2-6: 7:30, Thứ 7: 8:00
        if ($dayOfWeek === Carbon::SATURDAY) {
            return '08:00:00';
        }
        return '07:30:00';
    }

    /**
     * Lấy giờ kết thúc làm việc
     */
    private function getEndTime(int $dayOfWeek): string
    {
        // Thứ 2-6: 17:30, Thứ 7: 12:00
        if ($dayOfWeek === Carbon::SATURDAY) {
            return '12:00:00';
        }
        return '17:30:00';
    }

    /**
     * Lấy giờ kết thúc tăng ca
     */
    private function getOvertimeEndTime(): string
    {
        $hours = ['19:00:00', '19:30:00', '20:00:00', '20:30:00'];
        return $hours[array_rand($hours)];
    }

    /**
     * Lấy tên ngày lễ
     */
    private function getHolidayName(Carbon $date): string
    {
        $day = $date->day;
        $month = $date->month;

        if ($month === 1 && $day <= 2) {
            return 'Tết Nguyên Đán';
        } elseif ($month === 4 && $day === 10) {
            return 'Giỗ Tổ Hùng Vương';
        } elseif ($month === 4 && $day === 30) {
            return 'Ngày Giải phóng miền Nam';
        } elseif ($month === 5 && $day === 1) {
            return 'Ngày Quốc tế Lao động';
        } elseif ($month === 9 && $day === 2) {
            return 'Quốc khánh';
        }

        return 'Ngày lễ';
    }
}

