<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Thêm 'customer_paid' và 'confirmed' vào status enum
        DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('pending', 'customer_pending_approval', 'customer_approved', 'customer_paid', 'confirmed', 'paid', 'overdue') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert về enum cũ (xóa customer_paid)
        DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('pending', 'customer_pending_approval', 'customer_approved', 'paid', 'overdue') DEFAULT 'pending'");
    }
};
