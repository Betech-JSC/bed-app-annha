// database/migrations/2025_04_06_000002_create_flights_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flights', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Hành khách (Customer)
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();

            // Thông tin chuyến bay
            $table->char('from_airport', 3);      // SGN, HAN
            $table->char('to_airport', 3);
            $table->date('flight_date');          // Ngày bay
            $table->string('airline', 100);       // Vietnam Airlines, Vietjet...
            $table->string('flight_number', 10);  // VN1234, VJ789

            // Vé máy bay
            $table->string('boarding_pass_url')->nullable();
            $table->boolean('verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users');

            // Khối lượng mang thêm
            $table->decimal('max_weight', 4, 2)->default(5.00); // kg
            $table->decimal('booked_weight', 4, 2)->default(0.00); // đã book bao nhiêu

            $table->text('note')->nullable();

            $table->timestamps();

            // Index tối ưu matching
            $table->index(['from_airport', 'to_airport', 'flight_date']);
            $table->index(['customer_id', 'verified']);
            $table->index('verified');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};
