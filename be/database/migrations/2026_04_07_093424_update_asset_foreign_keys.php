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
            $table->dropForeign('asset_usages_company_asset_id_foreign');
            $table->foreign('equipment_id')->references('id')->on('equipment')->onDelete('cascade');
        });

        Schema::table('asset_depreciations', function (Blueprint $table) {
            $table->dropForeign('asset_depreciations_company_asset_id_foreign');
            $table->foreign('equipment_id')->references('id')->on('equipment')->onDelete('cascade');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropForeign('asset_assignments_company_asset_id_foreign');
            $table->foreign('equipment_id')->references('id')->on('equipment')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('asset_usages', function (Blueprint $table) {
            $table->dropForeign(['equipment_id']);
            $table->foreign('equipment_id')->references('id')->on('company_assets')->onDelete('cascade');
        });

        Schema::table('asset_depreciations', function (Blueprint $table) {
            $table->dropForeign(['equipment_id']);
            $table->foreign('equipment_id')->references('id')->on('company_assets')->onDelete('cascade');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropForeign(['equipment_id']);
            $table->foreign('equipment_id')->references('id')->on('company_assets')->onDelete('cascade');
        });
    }
};
