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
        // 1. material_transactions
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        Schema::table('material_transactions', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });

        // 2. receipts
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('material_suppliers')->nullOnDelete();
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });
        Schema::table('receipts', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('material_suppliers')->nullOnDelete();
        });
    }
};
