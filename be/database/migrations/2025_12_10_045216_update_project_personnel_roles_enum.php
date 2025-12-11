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
        // Cập nhật enum roles trong project_personnel
        // Các roles mới: management, accountant, team_leader, worker, guest, supervisor_guest, designer, supervisor
        DB::statement("ALTER TABLE project_personnel MODIFY COLUMN role ENUM(
            'project_manager',
            'supervisor',
            'accountant',
            'viewer',
            'editor',
            'management',
            'team_leader',
            'worker',
            'guest',
            'supervisor_guest',
            'designer'
        ) DEFAULT 'viewer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert về enum cũ
        DB::statement("ALTER TABLE project_personnel MODIFY COLUMN role ENUM(
            'project_manager',
            'supervisor',
            'accountant',
            'viewer',
            'editor'
        ) DEFAULT 'viewer'");
    }
};
