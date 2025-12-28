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
        Schema::create('calculation_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('payroll_id')->nullable()->constrained('payroll')->nullOnDelete();
            $table->string('calculation_type'); // 'revenue', 'costs', 'profit', 'payroll'
            $table->json('input_data')->nullable(); // Dữ liệu đầu vào
            $table->json('output_data')->nullable(); // Kết quả tính toán
            $table->json('validation_result')->nullable(); // Kết quả validation
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('calculated_at');
            $table->timestamps();

            $table->index(['project_id', 'calculation_type', 'calculated_at'], 'calc_audit_project_type_date_idx');
            $table->index(['payroll_id', 'calculated_at'], 'calc_audit_payroll_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calculation_audit_logs');
    }
};
