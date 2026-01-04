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
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->foreignId('cost_id')->nullable()->after('project_id')->constrained('costs')->nullOnDelete();
            $table->index(['cost_id', 'material_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->dropForeign(['cost_id']);
            $table->dropIndex(['cost_id', 'material_id']);
            $table->dropColumn('cost_id');
        });
    }
};
