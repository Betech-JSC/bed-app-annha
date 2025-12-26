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
            $table->foreignId('cost_group_id')->nullable()->after('category')->constrained('cost_groups')->nullOnDelete();
            $table->index('cost_group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['cost_group_id']);
            $table->dropIndex(['cost_group_id']);
            $table->dropColumn('cost_group_id');
        });
    }
};
