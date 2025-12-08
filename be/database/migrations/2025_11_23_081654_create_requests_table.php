<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('flight_id')->constrained('flights')->cascadeOnDelete();


            $table->string('time_slot')->nullable(); // morning, afternoon, evening, any
            $table->enum('item_type', ['document', 'contract', 'package', 'gift', 'other']);
            $table->text('item_description')->nullable();
            $table->text('note')->nullable();
            $table->decimal('item_value', 15, 2)->nullable();          // Giá trị ước tính (để bồi thường nếu mất)
            $table->decimal('reward', 12, 2)->nullable();               // Tiền công trả hành khách

            $table->enum('status', ['pending', 'accepted', 'confirmed', 'cancelled', 'expired', 'completed'])
                ->default('pending');

            $table->foreignId('accepted_by')->nullable()->constrained('users'); // Customer nào nhận
            $table->timestamp('accepted_at')->nullable();

            $table->foreignId('confirmed_by')->nullable()->constrained('users');
            $table->timestamp('confirmed_at')->nullable();

            // Hạn sử dụng
            $table->timestamp('expires_at')->index();       // Tự động hết hạn sau 48h

            $table->timestamps();

            // Index tối ưu cho matching
            $table->index(['status', 'expires_at']);
            $table->index('reward'); // Sắp xếp theo tiền công cao
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
