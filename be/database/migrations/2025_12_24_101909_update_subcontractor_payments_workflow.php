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
        Schema::table('subcontractor_payments', function (Blueprint $table) {
            // Thêm các field cho workflow
            $table->enum('status', ['draft', 'pending_management_approval', 'pending_accountant_approval', 'approved', 'paid', 'rejected', 'cancelled'])->default('draft')->change();
            $table->foreignId('management_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('approved_by');
            $table->timestamp('management_approved_at')->nullable()->after('approved_at');
            $table->foreignId('accountant_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('management_approved_at');
            $table->timestamp('accountant_approved_at')->nullable()->after('management_approved_at');
            $table->text('rejected_reason')->nullable()->after('accountant_approved_at');
            
            // Đổi tên approved_by thành created_by (nếu chưa có)
            // approved_by sẽ là management_approved_by
            // paid_by sẽ là accountant_approved_by
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subcontractor_payments', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'paid', 'cancelled'])->default('pending')->change();
            $table->dropColumn(['management_approved_by', 'management_approved_at', 'accountant_approved_by', 'accountant_approved_at', 'rejected_reason']);
        });
    }
};
