<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix: created_by FK constraint prevents Admin model from creating budgets.
     * Admin IDs don't exist in users table, causing FK violation.
     */
    public function up(): void
    {
        Schema::table('project_budgets', function (Blueprint $table) {
            // Drop FK constraint on created_by so Admin IDs work
            $table->dropForeign(['created_by']);
            // Make created_by nullable for safety
            $table->unsignedBigInteger('created_by')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_budgets', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });
    }
};
