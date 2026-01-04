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
        Schema::table('project_payments', function (Blueprint $table) {
            // Thêm fields cho customer approval
            $table->foreignId('customer_approved_by')->nullable()->after('confirmed_by')->constrained('users')->nullOnDelete();
            $table->timestamp('customer_approved_at')->nullable()->after('customer_approved_by');
            $table->timestamp('payment_proof_uploaded_at')->nullable()->after('customer_approved_at');
            
            // Cập nhật status enum để thêm customer_pending_approval và customer_approved
            // MySQL không hỗ trợ MODIFY ENUM trực tiếp, cần drop và add lại
            DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('pending', 'customer_pending_approval', 'customer_approved', 'paid', 'overdue') DEFAULT 'pending'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_payments', function (Blueprint $table) {
            $table->dropForeign(['customer_approved_by']);
            $table->dropColumn(['customer_approved_by', 'customer_approved_at', 'payment_proof_uploaded_at']);
            
            // Revert status enum về cũ
            DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending'");
        });
    }
};
