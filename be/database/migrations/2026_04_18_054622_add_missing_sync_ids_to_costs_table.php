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
            if (!Schema::hasColumn('costs', 'equipment_purchase_id')) {
                $table->unsignedBigInteger('equipment_purchase_id')->nullable()->after('equipment_rental_id');
                $table->index('equipment_purchase_id');
            }
            if (!Schema::hasColumn('costs', 'additional_cost_id')) {
                $table->unsignedBigInteger('additional_cost_id')->nullable()->after('material_bill_id');
                $table->index('additional_cost_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropIndex(['equipment_purchase_id']);
            $table->dropIndex(['additional_cost_id']);
            $table->dropColumn(['equipment_purchase_id', 'additional_cost_id']);
        });
    }
};
