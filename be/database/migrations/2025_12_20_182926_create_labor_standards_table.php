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
        Schema::create('labor_standards', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('team_id')->nullable(); // Foreign key sẽ được thêm sau
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete(); // Gắn với dự án cụ thể (nếu có)
            $table->string('work_item'); // Hạng mục công việc
            $table->string('unit')->default('m2'); // Đơn vị: m2, m3, kg, etc.
            $table->decimal('labor_hours_per_unit', 8, 2); // Số giờ công/đơn vị
            $table->decimal('labor_cost_per_unit', 15, 2)->nullable(); // Chi phí nhân công/đơn vị
            $table->integer('worker_count')->default(1); // Số lượng công nhân
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'is_active']);
            $table->index(['project_id', 'is_active']);
            $table->index('work_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('labor_standards');
    }
};
