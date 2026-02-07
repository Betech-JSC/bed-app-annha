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
            // Make project_id nullable to support company costs (costs not tied to a specific project)
            $table->unsignedBigInteger('project_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            // Revert project_id to not nullable
            $table->unsignedBigInteger('project_id')->nullable(false)->change();
        });
    }
};
