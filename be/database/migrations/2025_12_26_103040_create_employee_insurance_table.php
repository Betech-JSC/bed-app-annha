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
        Schema::create('employee_insurance', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('social_insurance_number')->nullable();
            $table->string('health_insurance_number')->nullable();
            $table->string('unemployment_insurance_number')->nullable();
            $table->date('insurance_start_date')->nullable();
            $table->date('insurance_end_date')->nullable();
            $table->decimal('social_insurance_rate', 5, 2)->default(0); // % đóng BHXH
            $table->decimal('health_insurance_rate', 5, 2)->default(0); // % đóng BHYT
            $table->decimal('unemployment_insurance_rate', 5, 2)->default(0); // % đóng BHTN
            $table->decimal('base_salary_for_insurance', 15, 2)->nullable(); // Lương cơ bản đóng BH
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_insurance');
    }
};
