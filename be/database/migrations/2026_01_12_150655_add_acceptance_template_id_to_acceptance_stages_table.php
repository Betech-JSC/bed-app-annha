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
            // Link to acceptance template from Settings
            if (!Schema::hasColumn('acceptance_stages', 'acceptance_template_id')) {
                $table->foreignId('acceptance_template_id')->nullable()->after('task_id')->constrained('acceptance_templates')->nullOnDelete();
                $table->index('acceptance_template_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_stages', function (Blueprint $table) {
            if (Schema::hasColumn('acceptance_stages', 'acceptance_template_id')) {
                $table->dropForeign(['acceptance_template_id']);
                $table->dropIndex(['acceptance_template_id']);
                $table->dropColumn('acceptance_template_id');
            }
        });
    }
};
