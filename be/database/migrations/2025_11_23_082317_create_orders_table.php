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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Liên kết
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->comment('Người gửi đồ'); // Sender
            $table->foreignId('customer_id')->constrained('users')->comment('Hành khách mang hộ'); // Customer
            $table->foreignId('flight_id')->nullable()->constrained('flights'); // Chuyến bay được chọn
            $table->string('chat_id')->nullable();
            $table->decimal('reward', 12, 2);                    // Tiền công hành khách
            $table->decimal('service_fee', 12, 2)->default(0);   // Phí SkySend (15–20%)
            $table->decimal('insurance_fee', 12, 2)->default(0); // Phí bảo hiểm (nếu có)
            $table->decimal('total_amount', 12, 2);              // Tổng tiền = reward + service_fee + insurance
            $table->decimal('escrow_amount', 12, 2);             // Số tiền đang bị khóa (escrow)
            $table->enum('escrow_status', ['held', 'released', 'refunded', 'disputed'])
                ->default('held');

            // Mã theo dõi
            $table->string('tracking_code', 20)->unique(); // VD: SK20250406001

            // Trạng thái đơn hàng
            $table->enum('status', [
                'confirmed',      // Người gửi đã xác nhận hành khách
                'picked_up',      // Hành khách đã nhận đồ tại sân bay đi
                'in_transit',     // Đang trên máy bay
                'arrived',        // Đã đến sân bay đích
                'delivered',      // Đã giao cho người gửi
                'declined',        // Từ chối
                'completed',      // Hoàn tất + giải ngân
                'cancelled',      // Hủy
                'failed'          // Thất lạc, hỏng
            ])->default('confirmed');

            // Thời gian quan trọng
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users');
            $table->text('cancel_reason')->nullable();

            // Địa điểm gặp (sân bay đi)
            $table->string('meeting_point_departure')->nullable(); // "Cột 12, Terminal 2"
            $table->timestamp('meeting_time_departure')->nullable();

            // Địa điểm giao (sân bay đến)
            $table->string('delivery_point_arrival')->nullable();   // "Cửa số 5, băng chuyền 3"
            $table->timestamp('delivery_time_arrival')->nullable();

            // Ghi chú & file đính kèm
            $table->text('customer_note')->nullable();    // Ghi chú của hành khách
            $table->text('sender_note')->nullable();      // Ghi chú của người gửi
            $table->json('attachments')->nullable();      // Ảnh, file hóa đơn, hợp đồng...

            // Đánh giá lẫn nhau (sau khi hoàn tất)
            $table->unsignedTinyInteger('sender_rating')->nullable();     // 1–5 sao
            $table->text('sender_review')->nullable();
            $table->unsignedTinyInteger('customer_rating')->nullable();
            $table->text('customer_review')->nullable();

            // Bảo hiểm & bồi thường (nếu mất)
            $table->boolean('insured')->default(false);
            $table->decimal('insured_amount', 15, 2)->nullable();
            $table->boolean('compensation_claimed')->default(false);
            $table->decimal('compensation_paid', 15, 2)->nullable();

            // Metadata
            $table->json('metadata')->nullable(); // Lưu thêm thông tin linh hoạt

            $table->timestamps();
            $table->softDeletes();

            // Index tối ưu
            $table->index(['sender_id', 'status']);
            $table->index(['customer_id', 'status']);
            $table->index('tracking_code');
            $table->index('status');
            $table->index(['created_at', 'status']);
            $table->index('escrow_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
