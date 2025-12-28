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
        Schema::create('acceptance_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tên công việc
            $table->text('description')->nullable(); // Mô tả
            $table->text('standard')->nullable(); // Tiêu chuẩn cho phép
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();

            $table->index('is_active');
            $table->index('order');
        });

        // Bảng lưu hình ảnh mẫu cho template
        Schema::create('acceptance_template_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('acceptance_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attachment_id')->constrained('attachments')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->timestamps();

            $table->index(['acceptance_template_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acceptance_template_images');
        Schema::dropIfExists('acceptance_templates');
    }
};
