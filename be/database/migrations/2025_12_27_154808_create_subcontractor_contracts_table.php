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
        Schema::create('subcontractor_contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('subcontractor_id')->constrained('subcontractors')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('global_subcontractor_id')->nullable()->constrained('global_subcontractors')->nullOnDelete();
            $table->string('contract_number')->unique()->nullable(); // Số hợp đồng
            $table->string('contract_name'); // Tên hợp đồng
            $table->text('description')->nullable();
            $table->date('contract_date'); // Ngày ký hợp đồng
            $table->date('start_date'); // Ngày bắt đầu
            $table->date('end_date')->nullable(); // Ngày kết thúc
            $table->decimal('contract_value', 15, 2); // Giá trị hợp đồng
            $table->decimal('advance_payment', 15, 2)->default(0); // Tạm ứng
            $table->decimal('retention', 15, 2)->default(0); // Bảo lưu
            $table->decimal('retention_percentage', 5, 2)->default(0); // % bảo lưu
            $table->enum('payment_method', ['milestone', 'progress', 'monthly', 'lump_sum'])->default('milestone');
            $table->json('payment_schedule')->nullable(); // Lịch thanh toán
            $table->enum('status', ['draft', 'active', 'suspended', 'completed', 'terminated', 'cancelled'])->default('draft');
            $table->text('terms_and_conditions')->nullable(); // Điều khoản
            $table->foreignId('signed_by')->nullable()->constrained('users')->nullOnDelete(); // Người ký
            $table->timestamp('signed_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subcontractor_id', 'status']);
            $table->index(['project_id', 'status']);
            $table->index('contract_number');
            $table->index('contract_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractor_contracts');
    }
};
