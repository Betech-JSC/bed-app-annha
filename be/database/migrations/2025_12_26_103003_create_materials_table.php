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
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->string('unit')->default('kg'); // Đơn vị: kg, m, m2, m3, thùng, bao...
            $table->text('description')->nullable();
            $table->string('category')->nullable(); // Vật liệu xây dựng, phụ kiện, dụng cụ...
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('min_stock', 10, 2)->default(0); // Mức tồn kho tối thiểu
            $table->decimal('max_stock', 10, 2)->nullable(); // Mức tồn kho tối đa
            $table->enum('status', ['active', 'inactive', 'discontinued'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category', 'status']);
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
