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
            $table->foreignId('equipment_allocation_id')->nullable()->after('material_id')->constrained('equipment_allocations')->nullOnDelete();
            $table->index(['project_id', 'equipment_allocation_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['equipment_allocation_id']);
            $table->dropIndex(['project_id', 'equipment_allocation_id']);
            $table->dropColumn('equipment_allocation_id');
        });
    }
};
