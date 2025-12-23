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
        Schema::create('subcontractor_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('subcontractor_id')->constrained('subcontractors')->cascadeOnDelete();
            $table->string('name'); // Tên hạng mục
            $table->text('description')->nullable();
            $table->decimal('unit_price', 15, 2)->default(0); // Đơn giá
            $table->decimal('quantity', 12, 2)->default(0); // Số lượng
            $table->string('unit')->nullable(); // Đơn vị tính
            $table->decimal('total_amount', 15, 2)->default(0); // Thành tiền
            $table->integer('order')->default(0); // Thứ tự
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subcontractor_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractor_items');
    }
};

