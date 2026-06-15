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
        Schema::table('cost_groups', function (Blueprint $table) {
            $table->string('expense_category')->nullable()->after('description'); // capex, opex
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cost_groups', function (Blueprint $table) {
            $table->dropColumn('expense_category');
        });
    }
};
