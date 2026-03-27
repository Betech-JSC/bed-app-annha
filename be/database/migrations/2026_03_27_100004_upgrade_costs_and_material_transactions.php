<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Thêm cột thuế vào bảng costs
        Schema::table('costs', function (Blueprint $table) {
            $table->decimal('tax_amount', 18, 2)->default(0)->after('amount');
            $table->decimal('tax_rate', 5, 2)->default(0)->after('tax_amount');
            $table->string('tax_type', 30)->default('VAT')->after('tax_rate'); // VAT, GTGT
            $table->boolean('is_warranty_cost')->default(false)->after('tax_type');
        });

        // Thêm cột vào material_transactions
        Schema::table('material_transactions', function (Blueprint $table) {
            $table->string('warehouse_location', 100)->nullable()->after('notes');
            $table->string('batch_number', 50)->nullable()->after('warehouse_location');
        });
    }

    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropColumn(['tax_amount', 'tax_rate', 'tax_type', 'is_warranty_cost']);
        });

        Schema::table('material_transactions', function (Blueprint $table) {
            $table->dropColumn(['warehouse_location', 'batch_number']);
        });
    }
};
