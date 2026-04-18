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
        Schema::table('project_payments', function (Blueprint $table) {
            DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('draft', 'pending', 'customer_pending_approval', 'customer_approved', 'customer_paid', 'confirmed', 'paid', 'overdue', 'rejected', 'customer_rejected') DEFAULT 'draft'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_payments', function (Blueprint $table) {
            DB::statement("ALTER TABLE project_payments MODIFY COLUMN status ENUM('pending', 'customer_pending_approval', 'customer_approved', 'customer_paid', 'confirmed', 'paid', 'overdue') DEFAULT 'pending'");
        });
    }
};
