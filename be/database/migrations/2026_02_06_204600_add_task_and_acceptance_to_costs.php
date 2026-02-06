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
        Schema::table('costs', function (Blueprint $table) {
            // Link to task - chi phí thuộc công việc nào
            $table->foreignId('task_id')
                ->nullable()
                ->after('project_id')
                ->constrained('project_tasks')
                ->onDelete('set null')
                ->comment('Công việc liên quan đến chi phí này');

            // Link to acceptance stage - chi phí thuộc giai đoạn nghiệm thu nào
            $table->foreignId('acceptance_stage_id')
                ->nullable()
                ->after('task_id')
                ->constrained('acceptance_stages')
                ->onDelete('set null')
                ->comment('Giai đoạn nghiệm thu liên quan (thanh toán theo tiến độ)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropForeign(['acceptance_stage_id']);
            $table->dropColumn(['task_id', 'acceptance_stage_id']);
        });
    }
};
