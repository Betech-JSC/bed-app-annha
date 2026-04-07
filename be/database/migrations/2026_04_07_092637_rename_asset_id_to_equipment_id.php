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
        Schema::table('asset_usages', function (Blueprint $table) {
            $table->renameColumn('company_asset_id', 'equipment_id');
        });

        Schema::table('asset_depreciations', function (Blueprint $table) {
            $table->renameColumn('company_asset_id', 'equipment_id');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->renameColumn('company_asset_id', 'equipment_id');
        });
    }

    public function down(): void
    {
        Schema::table('asset_usages', function (Blueprint $table) {
            $table->renameColumn('equipment_id', 'company_asset_id');
        });

        Schema::table('asset_depreciations', function (Blueprint $table) {
            $table->renameColumn('equipment_id', 'company_asset_id');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->renameColumn('equipment_id', 'company_asset_id');
        });
    }
};
