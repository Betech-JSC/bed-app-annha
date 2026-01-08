<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('acceptance_stages', function (Blueprint $table) {
            // BUSINESS RULE: Stage must be selected from Progress (parent task A only)
            // Check if column already exists before adding
            if (!Schema::hasColumn('acceptance_stages', 'task_id')) {
                $table->foreignId('task_id')->nullable()->after('project_id')->constrained('project_tasks')->nullOnDelete();
                $table->index('task_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_stages', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropIndex(['task_id']);
            $table->dropColumn('task_id');
        });
    }
};
