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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();              // Tên cấu hình (ví dụ: "base_rate_per_km")
            $table->text('value')->nullable();            // Giá trị (có thể là text hoặc JSON)
            $table->string('type')->default('string');    // string, integer, boolean, json,...
            $table->string('group')->nullable();          // nhóm cấu hình (ví dụ: "fee", "system", "payment")
            $table->text('description')->nullable();      // mô tả để admin biết mục đích
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
