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
        // Update costs table status enum to support 'cancelled'
        DB::statement("ALTER TABLE costs MODIFY COLUMN status ENUM('draft', 'pending_management_approval', 'pending_accountant_approval', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft'");
        
        // Update material_bills table status enum to support 'cancelled'
        DB::statement("ALTER TABLE material_bills MODIFY COLUMN status ENUM('draft', 'pending_management', 'pending_accountant', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert costs table status enum (remove 'cancelled')
        DB::statement("ALTER TABLE costs MODIFY COLUMN status ENUM('draft', 'pending_management_approval', 'pending_accountant_approval', 'approved', 'rejected') NOT NULL DEFAULT 'draft'");
        
        // Revert material_bills table status enum (remove 'cancelled')
        DB::statement("ALTER TABLE material_bills MODIFY COLUMN status ENUM('draft', 'pending_management', 'pending_accountant', 'approved', 'rejected') NOT NULL DEFAULT 'draft'");
    }
};
