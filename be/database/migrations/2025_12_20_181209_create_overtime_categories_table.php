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
        Schema::create('overtime_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tên hạng mục (ví dụ: "Đổ bê tông", "Lắp đặt điện")
            $table->string('code')->unique()->nullable(); // Mã hạng mục
            $table->text('description')->nullable();
            $table->decimal('default_multiplier', 4, 2)->nullable(); // Hệ số OT mặc định cho hạng mục này
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('overtime_categories');
    }
};
