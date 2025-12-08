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
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 15, 2)->default(0);
            $table->decimal('frozen_balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('VND');
            $table->enum('status', ['active', 'locked'])->default('active');
            $table->timestamp('last_transaction_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['status', 'currency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
