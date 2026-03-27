<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ============ 1. CHẤM CÔNG (Attendance) ============
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('project_id')->nullable()->constrained()->onDelete('set null');
                $table->date('work_date');
                $table->time('check_in')->nullable();
                $table->time('check_out')->nullable();
                $table->decimal('hours_worked', 5, 2)->default(0); // Tổng giờ làm
                $table->decimal('overtime_hours', 5, 2)->default(0); // Giờ OT
                $table->enum('status', ['present', 'absent', 'late', 'half_day', 'leave', 'holiday'])->default('present');
                $table->enum('check_in_method', ['manual', 'qr_code', 'gps', 'face_recognition'])->default('manual');
                $table->decimal('latitude', 10, 7)->nullable(); // GPS
                $table->decimal('longitude', 10, 7)->nullable();
                $table->text('note')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'work_date']);
                $table->index(['project_id', 'work_date']);
            });
        }

        // ============ 2. PHÂN CA (Work Shifts) ============
        if (!Schema::hasTable('work_shifts')) {
            Schema::create('work_shifts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->nullable()->constrained()->onDelete('cascade');
                $table->string('name'); // Ca sáng, Ca chiều, Ca đêm
                $table->time('start_time');
                $table->time('end_time');
                $table->decimal('break_hours', 4, 2)->default(0); // Giờ nghỉ giữa ca
                $table->boolean('is_overtime_shift')->default(false);
                $table->decimal('overtime_multiplier', 3, 2)->default(1.50);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // ============ 3. PHÂN CA NHÂN SỰ (Shift Assignments) ============
        if (!Schema::hasTable('shift_assignments')) {
            Schema::create('shift_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('work_shift_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('project_id')->nullable()->constrained()->onDelete('set null');
                $table->date('assigned_date');
                $table->enum('status', ['scheduled', 'checked_in', 'completed', 'absent', 'swapped'])->default('scheduled');
                $table->text('note')->nullable();
                $table->foreignId('assigned_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();

                $table->index(['user_id', 'assigned_date']);
                $table->index(['project_id', 'assigned_date']);
            });
        }

        // ============ 4. NĂNG SUẤT LAO ĐỘNG (Labor Productivity) ============
        if (!Schema::hasTable('labor_productivity')) {
            Schema::create('labor_productivity', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->foreignId('task_id')->nullable()->constrained('project_tasks')->onDelete('set null');
                $table->date('record_date');
                $table->string('work_item'); // Hạng mục công việc
                $table->string('unit')->default('m²'); // Đơn vị: m², m³, mét, cái, tấn...
                $table->decimal('planned_quantity', 12, 2)->default(0); // Khối lượng kế hoạch
                $table->decimal('actual_quantity', 12, 2)->default(0); // Khối lượng thực tế
                $table->integer('workers_count')->default(1); // Số công nhân
                $table->decimal('hours_spent', 6, 2)->default(8); // Số giờ làm
                $table->decimal('productivity_rate', 10, 2)->default(0); // Năng suất = actual / (workers * hours)
                $table->decimal('efficiency_percent', 5, 2)->default(0); // % hiệu suất = actual/planned * 100
                $table->text('note')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();

                $table->index(['project_id', 'record_date']);
                $table->index(['user_id', 'record_date']);
            });
        }

        // ============ 5. ĐỊNH MỨC VẬT TƯ CHI TIẾT (Material Quotas Enhancement) ============
        // Thêm trường vào existing material_quotas nếu cần
        if (Schema::hasTable('material_quotas')) {
            Schema::table('material_quotas', function (Blueprint $table) {
                if (!Schema::hasColumn('material_quotas', 'warning_threshold')) {
                    $table->decimal('warning_threshold', 5, 2)->default(90)->after('actual_quantity')
                        ->comment('Ngưỡng cảnh báo (% so với định mức)');
                }
                if (!Schema::hasColumn('material_quotas', 'auto_warning')) {
                    $table->boolean('auto_warning')->default(true)->after('warning_threshold');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('material_quotas', function (Blueprint $table) {
            if (Schema::hasColumn('material_quotas', 'warning_threshold')) {
                $table->dropColumn(['warning_threshold', 'auto_warning']);
            }
        });
        Schema::dropIfExists('labor_productivity');
        Schema::dropIfExists('shift_assignments');
        Schema::dropIfExists('work_shifts');
        Schema::dropIfExists('attendances');
    }
};
