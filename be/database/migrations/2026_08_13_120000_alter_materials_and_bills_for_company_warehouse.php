<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_bills', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->change();
        });

        Schema::table('material_inventory', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->change();
        });

        Schema::table('material_transactions', function (Blueprint $table) {
            $table->foreignId('target_project_id')->nullable()->after('project_id')->constrained('projects')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->dropForeign(['target_project_id']);
            $table->dropColumn('target_project_id');
        });

        Schema::table('material_inventory', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable(false)->change();
        });

        Schema::table('material_bills', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable(false)->change();
        });
    }
};
