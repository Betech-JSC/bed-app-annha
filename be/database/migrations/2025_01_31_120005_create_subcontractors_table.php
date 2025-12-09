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
        Schema::create('subcontractors', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category')->nullable(); // Hạng mục
            $table->decimal('total_quote', 15, 2);
            $table->decimal('advance_payment', 15, 2)->default(0);
            $table->decimal('total_paid', 15, 2)->default(0);
            $table->date('progress_start_date')->nullable();
            $table->date('progress_end_date')->nullable();
            $table->enum('progress_status', ['not_started', 'in_progress', 'completed', 'delayed'])->default('not_started');
            $table->enum('payment_status', ['pending', 'partial', 'completed'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete(); // Kế toán
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'progress_status']);
            $table->index(['project_id', 'payment_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subcontractors');
    }
};
