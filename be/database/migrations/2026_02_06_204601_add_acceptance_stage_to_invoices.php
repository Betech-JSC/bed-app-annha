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
        Schema::table('invoices', function (Blueprint $table) {
            // Link to acceptance stage - hóa đơn theo giai đoạn nghiệm thu
            $table->foreignId('acceptance_stage_id')
                ->nullable()
                ->after('cost_group_id')
                ->constrained('acceptance_stages')
                ->onDelete('set null')
                ->comment('Giai đoạn nghiệm thu liên quan (thanh toán theo tiến độ)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['acceptance_stage_id']);
            $table->dropColumn('acceptance_stage_id');
        });
    }
};
