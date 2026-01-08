<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * BUSINESS RULE: Add "delayed" status to support automatic status calculation.
     * Status rules:
     * - If today < start_date → Not Started
     * - If start_date ≤ today ≤ end_date AND percentage < 100 → In Progress
     * - If today > end_date AND percentage < 100 → Delayed
     * - If percentage = 100 → Completed
     */
    public function up(): void
    {
        // Modify enum to include 'delayed' status
        DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold', 'delayed') DEFAULT 'not_started'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Update any 'delayed' values to 'in_progress' before reverting enum
        DB::table('project_tasks')
            ->where('status', 'delayed')
            ->update(['status' => 'in_progress']);

        // Revert to original enum values
        DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold') DEFAULT 'not_started'");
    }
};
