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
            $table->foreignId('subcontractor_id')->nullable()->after('payroll_id')->constrained('subcontractors')->nullOnDelete();
            $table->index('subcontractor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['subcontractor_id']);
            $table->dropIndex(['subcontractor_id']);
            $table->dropColumn('subcontractor_id');
        });
    }
};
