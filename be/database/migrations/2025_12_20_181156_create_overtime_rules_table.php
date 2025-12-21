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
        Schema::create('overtime_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tên quy định
            $table->enum('type', ['weekday', 'weekend', 'holiday']); // Loại OT
            $table->time('start_time')->nullable(); // Giờ bắt đầu OT (ví dụ: 17:30)
            $table->time('end_time')->nullable(); // Giờ kết thúc OT (ví dụ: 22:00)
            $table->decimal('multiplier', 4, 2)->default(1.5); // Hệ số OT (1.5x, 2x, 3x...)
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('overtime_rules');
    }
};
