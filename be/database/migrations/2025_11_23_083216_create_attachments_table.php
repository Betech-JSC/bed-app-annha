<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            // Tên file gốc (VD: passport_nguyen_van_a.jpg)
            $table->string('original_name');

            // Tên file đã lưu trên server (VD: 1f2a3b4c5d.jpg)
            $table->string('file_name');

            // Đường dẫn đầy đủ hoặc URL
            $table->string('file_path');
            $table->string('file_url');

            // Kích thước file (bytes)
            $table->unsignedBigInteger('file_size')->nullable();

            // MIME type
            $table->string('mime_type')->nullable(); // image/jpeg, application/pdf...

            // Loại file (tùy chỉnh theo dự án)
            $table->string('type')->default('general'); // passport, ticket, contract, avatar, invoice...

            // Polymorphic: cho phép attach vào bất kỳ model nào
            $table->morphs('attachable'); // attachable_id + attachable_type
            // VD: attachable_type = App\Models\Order, attachable_id = 123

            // Người upload (nếu có auth)
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null');

            // Thứ tự hiển thị (khi có nhiều file)
            $table->unsignedInteger('sort_order')->default(0);

            // Ghi chú
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
