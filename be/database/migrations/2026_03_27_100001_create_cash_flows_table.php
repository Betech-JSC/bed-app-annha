<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_flows', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['inflow', 'outflow']);
            $table->enum('category', [
                'advance',              // Tạm ứng
                'progress_payment',     // Thanh toán theo tiến độ
                'retention',            // Giữ lại bảo hành
                'warranty',             // Chi phí bảo hành
                'material_purchase',    // Mua vật tư
                'labor',                // Nhân công
                'equipment',            // Thiết bị
                'subcontractor',        // Nhà thầu phụ
                'tax',                  // Thuế
                'other',                // Khác
            ]);
            $table->decimal('amount', 18, 2);
            $table->date('planned_date')->nullable();
            $table->date('actual_date')->nullable();
            $table->string('reference_type')->nullable(); // Polymorphic: Payment, Cost, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'type']);
            $table->index(['project_id', 'category']);
            $table->index(['planned_date']);
            $table->index(['actual_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_flows');
    }
};
