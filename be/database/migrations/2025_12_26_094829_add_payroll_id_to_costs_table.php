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
            $table->foreignId('payroll_id')->nullable()->after('time_tracking_id')->constrained('payroll')->nullOnDelete();
            $table->index('payroll_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['payroll_id']);
            $table->dropIndex(['payroll_id']);
            $table->dropColumn('payroll_id');
        });
    }
};
