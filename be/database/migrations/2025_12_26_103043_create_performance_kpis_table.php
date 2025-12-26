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
        Schema::create('performance_kpis', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('evaluation_id')->constrained('performance_evaluations')->cascadeOnDelete();
            $table->string('kpi_name');
            $table->text('description')->nullable();
            $table->decimal('target_value', 15, 2)->nullable();
            $table->decimal('actual_value', 15, 2)->nullable();
            $table->decimal('weight', 5, 2)->default(1); // Trọng số KPI
            $table->integer('score')->nullable(); // Score for this specific KPI
            $table->text('notes')->nullable();
            $table->integer('order')->default(0); // Thứ tự hiển thị
            $table->timestamps();

            $table->index('evaluation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_kpis');
    }
};
