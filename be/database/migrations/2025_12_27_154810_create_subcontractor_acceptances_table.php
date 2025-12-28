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
        Schema::create('subcontractor_acceptances', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('subcontractor_id')->constrained('subcontractors')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('subcontractor_contract_id')->nullable()->constrained('subcontractor_contracts')->nullOnDelete();
            $table->string('acceptance_number')->unique()->nullable(); // Số biên bản nghiệm thu
            $table->string('acceptance_name'); // Tên lần nghiệm thu (VD: "Nghiệm thu lần 1", "Nghiệm thu giai đoạn 1")
            $table->text('description')->nullable();
            $table->date('acceptance_date'); // Ngày nghiệm thu
            $table->decimal('accepted_volume', 12, 2)->default(0); // Khối lượng nghiệm thu
            $table->string('volume_unit')->default('m2'); // Đơn vị khối lượng
            $table->decimal('accepted_amount', 15, 2)->default(0); // Giá trị nghiệm thu
            $table->decimal('quality_score', 5, 2)->nullable(); // Điểm chất lượng (0-100)
            $table->enum('status', ['pending', 'approved', 'rejected', 'partially_approved'])->default('pending');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users')->nullOnDelete(); // Người nghiệm thu
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subcontractor_id', 'status']);
            $table->index(['project_id', 'acceptance_date']);
            $table->index('acceptance_number');
            $table->index('acceptance_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractor_acceptances');
    }
};
