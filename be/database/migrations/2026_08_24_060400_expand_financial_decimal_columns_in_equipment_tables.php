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
        if (Schema::hasTable('equipment_purchase_items')) {
            Schema::table('equipment_purchase_items', function (Blueprint $table) {
                $table->decimal('total_price', 20, 2)->default(0)->change();
                $table->decimal('unit_price', 20, 2)->default(0)->change();
                $table->bigInteger('quantity')->default(1)->change();
            });
        }

        if (Schema::hasTable('equipment_purchases')) {
            Schema::table('equipment_purchases', function (Blueprint $table) {
                $table->decimal('total_amount', 20, 2)->default(0)->change();
            });
        }

        if (Schema::hasTable('equipment')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->decimal('purchase_price', 20, 2)->nullable()->change();
                $table->decimal('current_value', 20, 2)->nullable()->change();
                if (Schema::hasColumn('equipment', 'original_value')) {
                    $table->decimal('original_value', 20, 2)->nullable()->change();
                }
                if (Schema::hasColumn('equipment', 'quantity')) {
                    $table->bigInteger('quantity')->default(1)->change();
                }
                if (Schema::hasColumn('equipment', 'remaining_quantity')) {
                    $table->bigInteger('remaining_quantity')->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('global_equipments')) {
            Schema::table('global_equipments', function (Blueprint $table) {
                $table->decimal('unit_price', 20, 2)->nullable()->change();
            });
        }

        if (Schema::hasTable('costs')) {
            Schema::table('costs', function (Blueprint $table) {
                $table->decimal('amount', 20, 2)->default(0)->change();
            });
        }

        if (Schema::hasTable('equipment_rentals')) {
            Schema::table('equipment_rentals', function (Blueprint $table) {
                if (Schema::hasColumn('equipment_rentals', 'rental_rate')) {
                    $table->decimal('rental_rate', 20, 2)->default(0)->change();
                }
                if (Schema::hasColumn('equipment_rentals', 'total_cost')) {
                    $table->decimal('total_cost', 20, 2)->default(0)->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down needed for precision expansion
    }
};
