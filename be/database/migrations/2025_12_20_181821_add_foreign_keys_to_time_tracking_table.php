<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Migration này chạy sau khi các bảng overtime_categories và team_check_ins đã được tạo
     */
    public function up(): void
    {
        Schema::table('time_tracking', function (Blueprint $table) {
            // Thêm foreign key cho overtime_category_id
            $table->foreign('overtime_category_id')
                ->references('id')
                ->on('overtime_categories')
                ->onDelete('set null');

            // Thêm foreign key cho team_check_in_id
            $table->foreign('team_check_in_id')
                ->references('id')
                ->on('team_check_ins')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_tracking', function (Blueprint $table) {
            $table->dropForeign(['overtime_category_id']);
            $table->dropForeign(['team_check_in_id']);
        });
    }
};
