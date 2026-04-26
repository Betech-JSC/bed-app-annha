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
        Schema::table('acceptances', function (Blueprint $table) {
            if (!Schema::hasColumn('acceptances', 'acceptance_template_id')) {
                $table->foreignId('acceptance_template_id')->nullable()->after('task_id')->constrained('acceptance_templates')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptances', function (Blueprint $table) {
            $table->dropForeign(['acceptance_template_id']);
            $table->dropColumn('acceptance_template_id');
        });
    }
};
