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
        if (Schema::hasTable('equipment_rentals') && !Schema::hasColumn('equipment_rentals', 'budget_item_id')) {
            Schema::table('equipment_rentals', function (Blueprint $table) {
                $table->unsignedBigInteger('budget_item_id')->nullable()->after('supplier_id');
                $table->foreign('budget_item_id')->references('id')->on('budget_items')->onDelete('set null');
            });
        }

        if (Schema::hasTable('equipment_purchases') && !Schema::hasColumn('equipment_purchases', 'budget_item_id')) {
            Schema::table('equipment_purchases', function (Blueprint $table) {
                $table->unsignedBigInteger('budget_item_id')->nullable()->after('project_id');
                $table->foreign('budget_item_id')->references('id')->on('budget_items')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('equipment_rentals') && Schema::hasColumn('equipment_rentals', 'budget_item_id')) {
            Schema::table('equipment_rentals', function (Blueprint $table) {
                $table->dropForeign(['budget_item_id']);
                $table->dropColumn('budget_item_id');
            });
        }

        if (Schema::hasTable('equipment_purchases') && Schema::hasColumn('equipment_purchases', 'budget_item_id')) {
            Schema::table('equipment_purchases', function (Blueprint $table) {
                $table->dropForeign(['budget_item_id']);
                $table->dropColumn('budget_item_id');
            });
        }
    }
};
