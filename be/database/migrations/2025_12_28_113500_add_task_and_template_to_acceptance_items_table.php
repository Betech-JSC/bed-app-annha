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
        Schema::table('acceptance_items', function (Blueprint $table) {
            // Thêm task_id và template_id
            $table->foreignId('task_id')->nullable()->after('acceptance_stage_id')->constrained('project_tasks')->nullOnDelete();
            $table->foreignId('acceptance_template_id')->nullable()->after('task_id')->constrained('acceptance_templates')->nullOnDelete();
            
            // Workflow approval fields
            $table->enum('workflow_status', ['draft', 'submitted', 'project_manager_approved', 'customer_approved', 'rejected'])->default('draft')->after('acceptance_status');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('project_manager_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('project_manager_approved_at')->nullable();
            $table->foreignId('customer_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('customer_approved_at')->nullable();
            
            $table->index(['task_id', 'acceptance_template_id']);
            $table->index('workflow_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_items', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropForeign(['acceptance_template_id']);
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['project_manager_approved_by']);
            $table->dropForeign(['customer_approved_by']);
            $table->dropIndex(['task_id', 'acceptance_template_id']);
            $table->dropIndex(['workflow_status']);
            $table->dropColumn([
                'task_id',
                'acceptance_template_id',
                'workflow_status',
                'submitted_by',
                'submitted_at',
                'project_manager_approved_by',
                'project_manager_approved_at',
                'customer_approved_by',
                'customer_approved_at',
            ]);
        });
    }
};
