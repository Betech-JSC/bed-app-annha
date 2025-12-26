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
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('remindable_type')->nullable(); // Polymorphic relation (e.g., Project, LeaveRequest)
            $table->unsignedBigInteger('remindable_id')->nullable();
            $table->string('title');
            $table->text('body')->nullable();
            $table->enum('reminder_type', ['payment_due', 'deadline', 'maintenance', 'contract_expiry', 'leave_balance', 'custom']);
            $table->timestamp('reminder_date');
            $table->timestamp('due_date')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->boolean('is_read')->default(false);
            $table->enum('status', ['pending', 'sent', 'completed', 'cancelled'])->default('pending');
            $table->boolean('is_recurring')->default(false);
            $table->enum('recurrence_pattern', ['daily', 'weekly', 'monthly'])->nullable();
            $table->integer('recurrence_interval')->default(1);
            $table->timestamp('next_reminder_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('reminder_date');
            $table->index(['remindable_type', 'remindable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
