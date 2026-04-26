<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acceptances', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('task_id')->constrained('project_tasks')->cascadeOnDelete();
            $table->foreignId('acceptance_template_id')->nullable()->constrained('acceptance_templates')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->enum('workflow_status', [
                'draft', 'submitted', 'supervisor_approved', 'customer_approved', 'rejected'
            ])->default('draft');
            $table->text('notes')->nullable();

            // Submission
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();

            // Level 1 — Supervisor
            $table->foreignId('supervisor_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('supervisor_approved_at')->nullable();

            // Level 3 — Customer
            $table->foreignId('customer_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('customer_approved_at')->nullable();

            // Rejection
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique('task_id');
            $table->index(['project_id', 'workflow_status'], 'idx_acceptances_project_status');
            $table->index(['project_id', 'order'], 'idx_acceptances_project_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acceptances');
    }
};
