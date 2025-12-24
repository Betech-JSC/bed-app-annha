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
        Schema::create('cost_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Mã nhóm (ví dụ: construction_materials)
            $table->string('name'); // Tên nhóm (ví dụ: Vật liệu xây dựng)
            $table->text('description')->nullable(); // Mô tả
            $table->integer('sort_order')->default(0); // Thứ tự hiển thị
            $table->boolean('is_active')->default(true); // Có đang sử dụng không
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_groups');
    }
};
