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
        Schema::create('subcontractor_payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('subcontractor_id')->constrained('subcontractors')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedBigInteger('work_volume_id')->nullable(); // Foreign key sẽ được thêm sau
            $table->string('payment_number')->unique()->nullable(); // Số phiếu thanh toán
            $table->string('payment_stage')->nullable(); // Giai đoạn thanh toán (VD: "Giai đoạn 1", "Nghiệm thu lần 1")
            $table->decimal('amount', 15, 2); // Số tiền thanh toán
            $table->decimal('accepted_volume', 12, 2)->nullable(); // Khối lượng nghiệm thu tương ứng
            $table->date('payment_date')->nullable(); // Ngày thanh toán
            $table->enum('payment_method', ['cash', 'bank_transfer', 'check', 'other'])->default('bank_transfer');
            $table->string('reference_number')->nullable(); // Số tham chiếu (số chứng từ)
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'approved', 'paid', 'cancelled'])->default('pending');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subcontractor_id', 'status']);
            $table->index(['project_id', 'status']);
            $table->index('payment_date');
            $table->index('payment_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractor_payments');
    }
};
