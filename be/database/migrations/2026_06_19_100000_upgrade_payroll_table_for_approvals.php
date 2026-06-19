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
        Schema::table('payroll', function (Blueprint $table) {
            // Change status column from enum to string
            $table->string('status', 50)->default('draft')->change();
            
            // Add new fields
            $table->string('payroll_number', 50)->nullable()->unique()->after('uuid');
            $table->decimal('allowance_amount', 15, 2)->default(0)->after('bonus_amount');
            
            // Add workflow approval tracking fields
            $table->foreignId('management_approved_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            $table->timestamp('management_approved_at')->nullable()->after('management_approved_by');
            
            $table->foreignId('accountant_approved_by')->nullable()->after('management_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('accountant_approved_at')->nullable()->after('accountant_approved_by');
            
            $table->text('rejected_reason')->nullable()->after('accountant_approved_at');
            
            // Add soft deletes
            $table->softDeletes()->after('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll', function (Blueprint $table) {
            $table->dropSoftDeletes();
            
            // Drop foreign keys first
            $table->dropForeign(['management_approved_by']);
            $table->dropForeign(['accountant_approved_by']);
            
            $table->dropColumn([
                'payroll_number',
                'allowance_amount',
                'management_approved_by',
                'management_approved_at',
                'accountant_approved_by',
                'accountant_approved_at',
                'rejected_reason',
            ]);
        });
    }
};
