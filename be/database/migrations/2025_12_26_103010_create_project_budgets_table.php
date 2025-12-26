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
        Schema::create('project_budgets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name'); // Tên ngân sách (ví dụ: Ngân sách ban đầu, Ngân sách điều chỉnh)
            $table->string('version')->default('1.0'); // Phiên bản ngân sách
            $table->decimal('total_budget', 15, 2)->default(0);
            $table->decimal('estimated_cost', 15, 2)->default(0); // Chi phí ước tính
            $table->decimal('actual_cost', 15, 2)->default(0); // Chi phí thực tế
            $table->decimal('remaining_budget', 15, 2)->default(0);
            $table->date('budget_date'); // Ngày lập ngân sách
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'approved', 'active', 'archived'])->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('budget_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_budgets');
    }
};
