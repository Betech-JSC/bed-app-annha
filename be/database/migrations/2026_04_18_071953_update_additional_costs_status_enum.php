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
        // Enlarge the status enum to include all workflow states used in local logic
        DB::statement("ALTER TABLE additional_costs CHANGE COLUMN status status ENUM('draft', 'pending', 'pending_approval', 'customer_paid', 'approved', 'confirmed', 'rejected') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original restricted enum if possible (note: might fail if new statuses are in use)
        DB::statement("ALTER TABLE additional_costs CHANGE COLUMN status status ENUM('draft', 'pending_approval', 'approved', 'rejected') DEFAULT 'draft'");
    }
};
