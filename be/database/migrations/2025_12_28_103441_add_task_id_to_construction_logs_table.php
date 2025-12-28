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
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->foreignId('task_id')->nullable()->after('project_id')->constrained('project_tasks')->nullOnDelete();
            $table->index(['project_id', 'task_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropIndex(['project_id', 'task_id']);
            $table->dropColumn('task_id');
        });
    }
};
