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
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->string('original_name'); // Tên file gốc
            $table->string('type')->nullable(); // Loại file (image, document, etc.)
            $table->string('file_name'); // Tên file đã lưu
            $table->string('file_path'); // Đường dẫn file
            $table->string('file_url')->nullable(); // URL file (nếu có)
            $table->bigInteger('file_size')->default(0); // Kích thước file (bytes)
            $table->string('mime_type')->nullable(); // MIME type
            $table->morphs('attachable'); // attachable_id, attachable_type (polymorphic)
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('sort_order')->default(0); // Thứ tự sắp xếp
            $table->text('description')->nullable(); // Mô tả
            $table->timestamps();

            $table->index(['attachable_id', 'attachable_type']);
            $table->index('uploaded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
