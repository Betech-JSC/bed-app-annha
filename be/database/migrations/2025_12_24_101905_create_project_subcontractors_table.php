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
        Schema::create('project_subcontractors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('global_subcontractor_id')->constrained('global_subcontractors')->cascadeOnDelete();
            $table->string('category')->nullable(); // Hạng mục trong dự án này
            $table->decimal('total_quote', 15, 2); // Tổng giá trị hợp đồng
            $table->decimal('advance_payment', 15, 2)->default(0); // Tạm ứng
            $table->decimal('total_paid', 15, 2)->default(0); // Tổng đã thanh toán
            $table->date('progress_start_date')->nullable(); // Ngày bắt đầu thi công
            $table->date('progress_end_date')->nullable(); // Ngày kết thúc thi công
            $table->enum('progress_status', ['not_started', 'in_progress', 'completed', 'delayed'])->default('not_started');
            $table->enum('payment_status', ['pending', 'partial', 'completed'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'global_subcontractor_id']);
            $table->index(['project_id', 'progress_status']);
            $table->index(['project_id', 'payment_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_subcontractors');
    }
};
