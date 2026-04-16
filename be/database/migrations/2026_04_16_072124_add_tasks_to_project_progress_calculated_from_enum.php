<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE project_progress MODIFY COLUMN calculated_from ENUM('logs', 'subcontractors', 'manual', 'acceptance', 'mixed', 'tasks') DEFAULT 'manual'");
    }

    public function down(): void
    {
        DB::table('project_progress')
            ->where('calculated_from', 'tasks')
            ->update(['calculated_from' => 'manual']);

        DB::statement("ALTER TABLE project_progress MODIFY COLUMN calculated_from ENUM('logs', 'subcontractors', 'manual', 'acceptance', 'mixed') DEFAULT 'manual'");
    }
};
