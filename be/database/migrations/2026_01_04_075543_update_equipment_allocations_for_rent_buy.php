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
        Schema::table('equipment_allocations', function (Blueprint $table) {
            // Type: rent (thuê) hoặc buy (mua)
            $table->enum('allocation_type', ['rent', 'buy'])->default('rent')->after('project_id');
            
            // Số lượng thiết bị được phân bổ
            $table->integer('quantity')->default(1)->after('allocation_type');
            
            // Cho MUA (buy):
            $table->foreignId('manager_id')->nullable()->after('allocated_to')->constrained('users')->nullOnDelete(); // Người quản lý thiết bị
            $table->date('handover_date')->nullable()->after('manager_id'); // Ngày bàn giao
            $table->date('return_date')->nullable()->after('handover_date'); // Ngày hoàn trả
            
            // Cho THUÊ (rent):
            $table->decimal('rental_fee', 15, 2)->nullable()->after('daily_rate'); // Tổng phí thuê (có thể khác daily_rate * số ngày)
            $table->date('billing_start_date')->nullable()->after('rental_fee'); // Ngày bắt đầu tính phí
            $table->date('billing_end_date')->nullable()->after('billing_start_date'); // Ngày kết thúc tính phí
            $table->foreignId('cost_id')->nullable()->after('billing_end_date')->constrained('costs')->nullOnDelete(); // Liên kết với Cost (tự động tạo khi thuê)
            
            $table->index(['allocation_type', 'status']);
            $table->index('cost_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_allocations', function (Blueprint $table) {
            $table->dropForeign(['manager_id']);
            $table->dropForeign(['cost_id']);
            $table->dropIndex(['allocation_type', 'status']);
            $table->dropIndex(['cost_id']);
            $table->dropColumn([
                'allocation_type',
                'quantity',
                'manager_id',
                'handover_date',
                'return_date',
                'rental_fee',
                'billing_start_date',
                'billing_end_date',
                'cost_id',
            ]);
        });
    }
};
