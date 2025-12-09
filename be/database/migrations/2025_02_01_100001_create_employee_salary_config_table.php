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
        Schema::create('employee_salary_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('salary_type', ['hourly', 'daily', 'monthly', 'project_based']);
            $table->decimal('hourly_rate', 15, 2)->nullable();
            $table->decimal('daily_rate', 15, 2)->nullable();
            $table->decimal('monthly_salary', 15, 2)->nullable();
            $table->decimal('project_rate', 15, 2)->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'effective_from']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_salary_config');
    }
};
