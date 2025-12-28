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
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name'); // Tên nhà cung cấp
            $table->string('code')->unique()->nullable(); // Mã nhà cung cấp
            $table->string('category')->nullable(); // Loại nhà cung cấp (vật liệu, thiết bị, dịch vụ...)
            $table->string('contact_person')->nullable(); // Người liên hệ
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('tax_code')->nullable(); // Mã số thuế
            $table->string('bank_name')->nullable(); // Tên ngân hàng
            $table->string('bank_account')->nullable(); // Số tài khoản
            $table->string('bank_account_holder')->nullable(); // Chủ tài khoản
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive', 'blacklisted'])->default('active');
            $table->decimal('total_debt', 15, 2)->default(0); // Tổng công nợ
            $table->decimal('total_paid', 15, 2)->default(0); // Tổng đã thanh toán
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'category']);
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
