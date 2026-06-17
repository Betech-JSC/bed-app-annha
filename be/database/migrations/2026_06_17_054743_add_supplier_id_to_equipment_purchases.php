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
        Schema::table('equipment_purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment_purchases', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->after('project_id')->constrained('suppliers')->nullOnDelete();
            }
            if (!Schema::hasColumn('equipment_purchases', 'purchase_date')) {
                $table->date('purchase_date')->nullable()->after('total_amount');
            }
        });

        Schema::table('equipment', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->after('brand')->constrained('suppliers')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
        });

        Schema::table('equipment_purchases', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn(['supplier_id', 'purchase_date']);
        });
    }
};
