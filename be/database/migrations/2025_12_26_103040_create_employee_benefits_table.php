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
        Schema::create('employee_benefits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name'); // Tên phúc lợi (ví dụ: Phụ cấp ăn trưa, Phụ cấp đi lại)
            $table->string('benefit_type')->nullable(); // Loại phúc lợi (ví dụ: Allowance, Bonus, Other)
            $table->text('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed'); // Cách tính: cố định, phần trăm
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('benefit_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_benefits');
    }
};
