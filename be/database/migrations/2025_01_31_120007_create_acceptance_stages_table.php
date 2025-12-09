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
        Schema::create('acceptance_stages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_custom')->default(false);
            $table->enum('status', ['pending', 'internal_approved', 'customer_approved', 'design_approved', 'owner_approved', 'rejected'])->default('pending');
            $table->foreignId('internal_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('internal_approved_at')->nullable();
            $table->foreignId('customer_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('customer_approved_at')->nullable();
            $table->foreignId('design_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('design_approved_at')->nullable();
            $table->foreignId('owner_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('owner_approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acceptance_stages');
    }
};
