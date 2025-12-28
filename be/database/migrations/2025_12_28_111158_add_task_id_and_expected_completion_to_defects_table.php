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
        // Check if columns already exist before adding
        if (!Schema::hasColumn('defects', 'task_id')) {
            Schema::table('defects', function (Blueprint $table) {
                $table->foreignId('task_id')->nullable()->after('project_id')->constrained('project_tasks')->nullOnDelete();
            });
        }

        if (!Schema::hasColumn('defects', 'expected_completion_date')) {
            Schema::table('defects', function (Blueprint $table) {
                $table->date('expected_completion_date')->nullable()->after('status');
            });
        }

        // Add index if task_id exists (ignore if index already exists)
        if (Schema::hasColumn('defects', 'task_id')) {
            try {
                Schema::table('defects', function (Blueprint $table) {
                    $table->index(['project_id', 'task_id'], 'defects_project_id_task_id_index');
                });
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('defects', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropIndex(['project_id', 'task_id']);
            $table->dropColumn(['task_id', 'expected_completion_date']);
        });
    }
};
