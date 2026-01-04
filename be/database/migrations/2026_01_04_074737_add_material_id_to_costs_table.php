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
            $table->foreignId('material_id')->nullable()->after('subcontractor_id')->constrained('materials')->nullOnDelete();
            $table->decimal('quantity', 10, 2)->nullable()->after('material_id'); // Số lượng vật liệu
            $table->string('unit', 20)->nullable()->after('quantity'); // Đơn vị tính
            $table->index(['project_id', 'material_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['material_id']);
            $table->dropIndex(['project_id', 'material_id']);
            $table->dropColumn(['material_id', 'quantity', 'unit']);
        });
    }
};
