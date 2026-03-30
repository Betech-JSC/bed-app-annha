<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->unsignedBigInteger('budget_item_id')->nullable()->after('cost_group_id');
            $table->foreign('budget_item_id')->references('id')->on('budget_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['budget_item_id']);
            $table->dropColumn('budget_item_id');
        });
    }
};
