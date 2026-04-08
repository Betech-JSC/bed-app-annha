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
        Schema::table('project_maintenances', function (Blueprint $table) {
            $table->string('status')->default('draft')->change(); // Chuyển default từ completed sang draft
            $table->unsignedBigInteger('approved_by')->nullable()->after('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_maintenances', function (Blueprint $table) {
            $table->string('status')->default('completed')->change();
            $table->dropColumn('approved_by');
        });
    }
};
