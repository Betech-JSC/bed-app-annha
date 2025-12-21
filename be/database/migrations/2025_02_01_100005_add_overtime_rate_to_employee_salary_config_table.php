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
        Schema::table('employee_salary_config', function (Blueprint $table) {
            $table->decimal('overtime_rate', 15, 2)->nullable()->after('project_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_salary_config', function (Blueprint $table) {
            $table->dropColumn('overtime_rate');
        });
    }
};

