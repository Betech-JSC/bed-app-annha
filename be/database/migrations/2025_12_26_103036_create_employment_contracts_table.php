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
        Schema::create('employment_contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('contract_number')->unique();
            $table->enum('contract_type', ['probation', 'fixed_term', 'indefinite', 'part_time', 'internship']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('base_salary', 15, 2);
            $table->string('job_title')->nullable();
            $table->text('job_description')->nullable();
            $table->text('benefits')->nullable(); // JSON or text for benefits
            $table->text('file_path')->nullable(); // Path to uploaded contract file
            $table->enum('status', ['active', 'expired', 'terminated', 'pending'])->default('pending');
            $table->date('terminated_date')->nullable();
            $table->text('termination_reason')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('contract_type');
            $table->index('start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employment_contracts');
    }
};
