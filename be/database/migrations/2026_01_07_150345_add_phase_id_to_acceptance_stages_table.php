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
            // BUSINESS RULE: Sync phase_id from task.phase_id
            $table->foreignId('phase_id')->nullable()->after('task_id')->constrained('project_phases')->nullOnDelete();
            $table->index('phase_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_stages', function (Blueprint $table) {
            $table->dropForeign(['phase_id']);
            $table->dropIndex(['phase_id']);
            $table->dropColumn('phase_id');
        });
    }
};
