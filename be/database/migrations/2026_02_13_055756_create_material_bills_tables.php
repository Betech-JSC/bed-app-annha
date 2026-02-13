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
        Schema::create('material_bills', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('bill_number')->nullable(); // Số hóa đơn/phiếu giao hàng
            $table->date('bill_date');
            $table->foreignId('cost_group_id')->nullable()->constrained('cost_groups')->nullOnDelete();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->enum('status', [
                'draft', 
                'pending_management', 
                'pending_accountant', 
                'approved', 
                'rejected'
            ])->default('draft');
            
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('management_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('management_approved_at')->nullable();
            $table->foreignId('accountant_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('accountant_approved_at')->nullable();
            $table->text('rejected_reason')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index('bill_date');
        });

        Schema::create('material_bill_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_bill_id')->constrained('material_bills')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('total_price', 15, 2);
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_bill_items');
        Schema::dropIfExists('material_bills');
    }
};
