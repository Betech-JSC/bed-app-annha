<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Expand the ENUM to include 'pending_acceptance' and 'delayed'
        DB::statement("ALTER TABLE `project_tasks` MODIFY COLUMN `status` ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold', 'delayed', 'pending_acceptance') NOT NULL DEFAULT 'not_started'");
    }

    public function down(): void
    {
        // Revert tasks with new statuses before shrinking ENUM
        DB::table('project_tasks')->where('status', 'pending_acceptance')->update(['status' => 'in_progress']);
        DB::table('project_tasks')->where('status', 'delayed')->update(['status' => 'in_progress']);
        DB::statement("ALTER TABLE `project_tasks` MODIFY COLUMN `status` ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold') NOT NULL DEFAULT 'not_started'");
    }
};
