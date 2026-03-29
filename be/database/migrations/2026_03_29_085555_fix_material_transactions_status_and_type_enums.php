<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix material_transactions enum columns that cause "Data truncated" errors.
     *
     * status: was ['pending','approved','rejected'] → add 'completed'
     * type:   was ['in','out','adjustment','transfer'] → add 'import','export'
     */
    public function up(): void
    {
        // Expand status enum
        DB::statement("ALTER TABLE `material_transactions` MODIFY COLUMN `status` ENUM('pending','approved','rejected','completed') DEFAULT 'pending'");

        // Expand type enum
        DB::statement("ALTER TABLE `material_transactions` MODIFY COLUMN `type` ENUM('in','out','adjustment','transfer','import','export') NOT NULL");

        // Normalise any existing 'completed' → 'approved' for consistency
        DB::table('material_transactions')
            ->where('status', 'completed')
            ->update(['status' => 'approved']);
    }

    public function down(): void
    {
        // Revert to original enums
        DB::statement("ALTER TABLE `material_transactions` MODIFY COLUMN `status` ENUM('pending','approved','rejected') DEFAULT 'pending'");
        DB::statement("ALTER TABLE `material_transactions` MODIFY COLUMN `type` ENUM('in','out','adjustment','transfer') NOT NULL");
    }
};
