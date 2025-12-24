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
        Schema::create('global_subcontractors', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name'); // Tên nhà thầu phụ
            $table->string('code')->unique()->nullable(); // Mã nhà thầu (nếu có)
            $table->string('contact_person')->nullable(); // Người liên hệ
            $table->string('phone')->nullable(); // Số điện thoại
            $table->string('email')->nullable(); // Email
            $table->text('address')->nullable(); // Địa chỉ
            $table->string('tax_code')->nullable(); // Mã số thuế
            $table->text('notes')->nullable(); // Ghi chú
            $table->boolean('is_active')->default(true); // Có đang hoạt động không
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('global_subcontractors');
    }
};
