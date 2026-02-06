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
        Schema::table('additional_costs', function (Blueprint $table) {
            // Link to defect - chi phí phát sinh do lỗi nào gây ra
            $table->foreignId('defect_id')
                ->nullable()
                ->after('project_id')
                ->constrained('defects')
                ->onDelete('set null')
                ->comment('Lỗi gây ra chi phí phát sinh này');
            
            // Link to task - chi phí phát sinh thuộc công việc nào
            $table->foreignId('task_id')
                ->nullable()
                ->after('defect_id')
                ->constrained('project_tasks')
                ->onDelete('set null')
                ->comment('Công việc liên quan đến chi phí phát sinh');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('additional_costs', function (Blueprint $table) {
            $table->dropForeign(['defect_id']);
            $table->dropForeign(['task_id']);
            $table->dropColumn(['defect_id', 'task_id']);
        });
    }
};
