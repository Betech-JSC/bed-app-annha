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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // BANK_TRANSFER, MOMO
            $table->string('name');
            $table->string('provider')->nullable();
            $table->enum('type', ['bank_transfer', 'ewallet', 'card', 'cash', 'manual'])->default('bank_transfer');
            $table->boolean('is_active')->default(true);
            $table->decimal('min_amount', 15, 2)->default(10000);
            $table->decimal('max_amount', 15, 2)->default(100000000);
            $table->decimal('fee_percent', 5, 2)->default(0);
            $table->decimal('fee_flat', 15, 2)->default(0);
            $table->text('instructions')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};

