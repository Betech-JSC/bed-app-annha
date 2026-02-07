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
            if (!Schema::hasColumn('costs', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete()->after('cost_group_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            if (Schema::hasColumn('costs', 'supplier_id')) {
                $table->dropForeign(['supplier_id']);
                $table->dropColumn('supplier_id');
            }
        });
    }
};
