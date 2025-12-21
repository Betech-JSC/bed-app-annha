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
        Schema::create('work_volumes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('team_id')->nullable(); // Foreign key sẽ được thêm sau
            $table->foreignId('subcontractor_id')->nullable()->constrained('subcontractors')->nullOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedBigInteger('labor_standard_id')->nullable(); // Foreign key sẽ được thêm sau
            $table->string('work_item'); // Hạng mục công việc
            $table->string('unit')->default('m2'); // Đơn vị
            $table->decimal('planned_volume', 12, 2)->default(0); // Khối lượng kế hoạch
            $table->decimal('completed_volume', 12, 2)->default(0); // Khối lượng hoàn thành
            $table->decimal('accepted_volume', 12, 2)->default(0); // Khối lượng nghiệm thu
            $table->date('work_date')->nullable(); // Ngày thực hiện
            $table->text('notes')->nullable();
            $table->enum('status', ['in_progress', 'completed', 'accepted', 'rejected'])->default('in_progress');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete(); // Người xác nhận nghiệm thu
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'status']);
            $table->index(['subcontractor_id', 'status']);
            $table->index(['project_id', 'work_date']);
            $table->index('work_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_volumes');
    }
};
