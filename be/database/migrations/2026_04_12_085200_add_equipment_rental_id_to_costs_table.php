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
            $table->foreignId('equipment_rental_id')
                ->nullable()
                ->after('equipment_allocation_id')
                ->constrained('equipment_rentals')
                ->nullOnDelete();
            
            $table->index('equipment_rental_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['equipment_rental_id']);
            $table->dropColumn('equipment_rental_id');
        });
    }
};
