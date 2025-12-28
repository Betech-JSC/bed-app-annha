<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subcontractor_progress', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('subcontractor_id')->constrained('subcontractors')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('subcontractor_contract_id')->nullable()->constrained('subcontractor_contracts')->nullOnDelete();
            $table->date('progress_date'); // Ngày báo cáo tiến độ
            $table->decimal('planned_progress', 5, 2)->default(0); // Tiến độ kế hoạch (%)
            $table->decimal('actual_progress', 5, 2)->default(0); // Tiến độ thực tế (%)
            $table->decimal('completed_volume', 12, 2)->default(0); // Khối lượng hoàn thành
            $table->string('volume_unit')->default('m2'); // Đơn vị
            $table->text('work_description')->nullable(); // Mô tả công việc đã làm
            $table->text('next_week_plan')->nullable(); // Kế hoạch tuần tới
            $table->text('issues_and_risks')->nullable(); // Vấn đề và rủi ro
            $table->enum('status', ['on_schedule', 'delayed', 'ahead_of_schedule', 'at_risk'])->default('on_schedule');
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete(); // Người báo cáo
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete(); // Người xác nhận
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subcontractor_id', 'progress_date']);
            $table->index(['project_id', 'progress_date']);
            $table->index('progress_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractor_progress');
    }
};
