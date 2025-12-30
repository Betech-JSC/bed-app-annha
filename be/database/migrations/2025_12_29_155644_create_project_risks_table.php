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
        Schema::create('project_risks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', ['schedule', 'cost', 'quality', 'scope', 'resource', 'technical', 'external', 'other'])->default('other');
            $table->enum('probability', ['very_low', 'low', 'medium', 'high', 'very_high'])->default('medium');
            $table->enum('impact', ['very_low', 'low', 'medium', 'high', 'very_high'])->default('medium');
            $table->enum('status', ['identified', 'analyzed', 'mitigated', 'monitored', 'closed'])->default('identified');
            $table->enum('risk_type', ['threat', 'opportunity'])->default('threat');
            $table->text('mitigation_plan')->nullable();
            $table->text('contingency_plan')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('identified_date')->default(now());
            $table->date('target_resolution_date')->nullable();
            $table->date('resolved_date')->nullable();
            $table->foreignId('identified_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'category']);
            $table->index('probability');
            $table->index('impact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_risks');
    }
};
