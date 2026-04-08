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
        Schema::table('equipment_rentals', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_rentals', 'quantity')) {
                $table->integer('quantity')->default(1)->after('equipment_name');
            }
            if (!Schema::hasColumn('equipment_rentals', 'unit_price')) {
                $table->decimal('unit_price', 15, 2)->nullable()->after('quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_rentals', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'unit_price']);
        });
    }
};
