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
            $table->unsignedBigInteger('material_bill_id')->nullable()->after('subcontractor_payment_id');
            $table->foreign('material_bill_id')->references('id')->on('material_bills')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['material_bill_id']);
            $table->dropColumn('material_bill_id');
        });
    }
};
