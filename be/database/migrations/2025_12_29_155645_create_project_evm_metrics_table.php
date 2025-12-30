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
        Schema::create('project_evm_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->date('calculation_date');
            
            // Planned Value (PV) - Giá trị kế hoạch
            $table->decimal('planned_value', 15, 2)->default(0);
            
            // Earned Value (EV) - Giá trị đạt được
            $table->decimal('earned_value', 15, 2)->default(0);
            
            // Actual Cost (AC) - Chi phí thực tế
            $table->decimal('actual_cost', 15, 2)->default(0);
            
            // Performance Indices
            $table->decimal('cost_performance_index', 8, 4)->nullable()->comment('CPI = EV/AC');
            $table->decimal('schedule_performance_index', 8, 4)->nullable()->comment('SPI = EV/PV');
            
            // Variances
            $table->decimal('cost_variance', 15, 2)->nullable()->comment('CV = EV - AC');
            $table->decimal('schedule_variance', 15, 2)->nullable()->comment('SV = EV - PV');
            
            // Estimates
            $table->decimal('estimate_at_completion', 15, 2)->nullable()->comment('EAC = BAC/CPI');
            $table->decimal('estimate_to_complete', 15, 2)->nullable()->comment('ETC = EAC - AC');
            $table->decimal('variance_at_completion', 15, 2)->nullable()->comment('VAC = BAC - EAC');
            
            // Budget at Completion (BAC)
            $table->decimal('budget_at_completion', 15, 2)->nullable();
            
            // Progress percentage
            $table->decimal('progress_percentage', 5, 2)->default(0);
            
            $table->text('notes')->nullable();
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'calculation_date']);
            $table->unique(['project_id', 'calculation_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_evm_metrics');
    }
};
