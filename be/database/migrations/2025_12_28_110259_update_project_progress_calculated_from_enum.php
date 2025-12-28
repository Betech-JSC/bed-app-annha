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
        // Modify enum to include new values
        DB::statement("ALTER TABLE project_progress MODIFY COLUMN calculated_from ENUM('logs', 'subcontractors', 'manual', 'acceptance', 'mixed') DEFAULT 'manual'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Update any 'acceptance' or 'mixed' values to 'manual' before reverting enum
        DB::table('project_progress')
            ->whereIn('calculated_from', ['acceptance', 'mixed'])
            ->update(['calculated_from' => 'manual']);

        // Revert to original enum values
        DB::statement("ALTER TABLE project_progress MODIFY COLUMN calculated_from ENUM('logs', 'subcontractors', 'manual') DEFAULT 'manual'");
    }
};
