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
        if (Schema::hasTable('costs') && !Schema::hasColumn('costs', 'deleted_at')) {
            Schema::table('costs', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('equipment_rentals') && !Schema::hasColumn('equipment_rentals', 'deleted_at')) {
            Schema::table('equipment_rentals', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('additional_costs') && !Schema::hasColumn('additional_costs', 'deleted_at')) {
            Schema::table('additional_costs', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('costs') && Schema::hasColumn('costs', 'deleted_at')) {
            Schema::table('costs', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('equipment_rentals') && Schema::hasColumn('equipment_rentals', 'deleted_at')) {
            Schema::table('equipment_rentals', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('additional_costs') && Schema::hasColumn('additional_costs', 'deleted_at')) {
            Schema::table('additional_costs', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
