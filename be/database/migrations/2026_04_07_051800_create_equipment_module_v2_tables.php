<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {


        // ─── Module 1: Thuê thiết bị ───
        Schema::create('equipment_rentals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('equipment_name'); // Tên thiết bị
            $table->foreignId('equipment_id')->nullable()->constrained('equipment')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->date('rental_start_date');
            $table->date('rental_end_date');
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->enum('status', ['draft', 'pending_management', 'pending_accountant', 'completed', 'rejected'])->default('draft');
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('cost_id')->nullable()->constrained('costs')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
        });

        // ─── Module 2: Mua thiết bị ───
        Schema::create('equipment_purchases', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->enum('status', ['draft', 'pending_management', 'pending_accountant', 'completed', 'rejected'])->default('draft');
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
        });

        Schema::create('equipment_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('equipment_purchases')->cascadeOnDelete();
            $table->string('name'); // Tên thiết bị
            $table->string('code')->nullable(); // Mã thiết bị
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0); // = quantity * unit_price
            $table->timestamps();
        });

        // ─── Module 3: Sử dụng tài sản ───
        Schema::create('asset_usages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('company_asset_id')->constrained('company_assets')->cascadeOnDelete();
            $table->integer('quantity')->default(1);
            $table->foreignId('receiver_id')->constrained('users');
            $table->date('received_date');
            $table->date('returned_date')->nullable();
            $table->enum('status', ['pending_receive', 'in_use', 'pending_return', 'returned'])->default('pending_receive');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index(['company_asset_id', 'status']);
            $table->index('receiver_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_usages');
        Schema::dropIfExists('equipment_purchase_items');
        Schema::dropIfExists('equipment_purchases');
        Schema::dropIfExists('equipment_rentals');

    }
};
