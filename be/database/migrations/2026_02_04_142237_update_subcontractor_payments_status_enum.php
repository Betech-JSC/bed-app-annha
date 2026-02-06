<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL không cho phép thay đổi ENUM trực tiếp, phải dùng raw SQL
        DB::statement("ALTER TABLE subcontractor_payments MODIFY COLUMN status ENUM('draft', 'pending_management_approval', 'pending_accountant_confirmation', 'approved', 'paid', 'rejected', 'cancelled') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback về enum cũ
        DB::statement("ALTER TABLE subcontractor_payments MODIFY COLUMN status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending'");
    }
};
