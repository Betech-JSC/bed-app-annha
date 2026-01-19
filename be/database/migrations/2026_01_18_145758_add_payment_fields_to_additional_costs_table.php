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
        Schema::table('additional_costs', function (Blueprint $table) {
            $table->date('paid_date')->nullable()->after('rejected_reason');
            $table->decimal('actual_amount', 15, 2)->nullable()->after('paid_date');
            $table->foreignId('confirmed_by')->nullable()->after('actual_amount')->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            $table->foreignId('customer_paid_by')->nullable()->after('confirmed_at')->constrained('users')->nullOnDelete();
            $table->timestamp('customer_paid_at')->nullable()->after('customer_paid_by');
            
            // Update status enum to include new statuses
            $table->enum('status', ['pending', 'pending_approval', 'customer_paid', 'confirmed', 'approved', 'rejected'])
                ->default('pending')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('additional_costs', function (Blueprint $table) {
            $table->dropColumn([
                'paid_date',
                'actual_amount',
                'confirmed_by',
                'confirmed_at',
                'customer_paid_by',
                'customer_paid_at',
            ]);
            
            // Revert status enum
            $table->enum('status', ['pending_approval', 'approved', 'rejected'])
                ->default('pending_approval')
                ->change();
        });
    }
};
