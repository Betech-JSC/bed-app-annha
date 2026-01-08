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
     * BUSINESS RULE: Remove 'cancelled' and 'on_hold' statuses.
     * Only these statuses are allowed:
     * - not_started: current date < start_date
     * - in_progress: start_date <= today <= end_date AND % < 100
     * - delayed: today > end_date AND % < 100
     * - completed: % == 100
     * 
     * Unused progress items must be deleted, not paused or cancelled.
     */
    public function up(): void
    {
        // Update any 'cancelled' or 'on_hold' tasks to 'not_started' before removing from enum
        DB::table('project_tasks')
            ->whereIn('status', ['cancelled', 'on_hold'])
            ->update(['status' => 'not_started']);

        // Modify enum to only include allowed statuses
        DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('not_started', 'in_progress', 'completed', 'delayed') DEFAULT 'not_started'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold', 'delayed') DEFAULT 'not_started'");
    }
};
