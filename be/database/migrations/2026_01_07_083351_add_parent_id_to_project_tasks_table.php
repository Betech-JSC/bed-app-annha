<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Run the migrations.
     * 
     * BUSINESS RULE: Add parent_id to support hierarchical progress structure (WBS).
     * Parent progress = average of children. Parent can only be completed when all children are 100%.
     */
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('phase_id')
                ->constrained('project_tasks')
                ->nullOnDelete()
                ->comment('Parent task for hierarchical structure (WBS)');
            
            $table->index(['project_id', 'parent_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex(['project_id', 'parent_id']);
            $table->dropColumn('parent_id');
        });
    }
};
