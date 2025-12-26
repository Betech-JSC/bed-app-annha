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
            $table->foreignId('time_tracking_id')->nullable()->after('cost_group_id')->constrained('time_tracking')->nullOnDelete();
            $table->index('time_tracking_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['time_tracking_id']);
            $table->dropIndex(['time_tracking_id']);
            $table->dropColumn('time_tracking_id');
        });
    }
};
