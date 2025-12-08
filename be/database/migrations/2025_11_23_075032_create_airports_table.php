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
        Schema::create('airports', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // nên thêm unique cho mã sân bay
            $table->string('city_code', 10);
            $table->string('name_vi')->nullable();;
            $table->string('name_en')->nullable();;
            $table->string('latitude_deg')->nullable();
            $table->string('longitude_deg')->nullable();;
            $table->string('country')->nullable();;
            $table->string('country_code')->nullable();;
            $table->string('continent')->nullable();;
            $table->string('timezone')->nullable();
            $table->timestamps();

            // Optional: thêm index để tìm kiếm nhanh hơn
            $table->index('city_code');
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('airports');
    }
};
