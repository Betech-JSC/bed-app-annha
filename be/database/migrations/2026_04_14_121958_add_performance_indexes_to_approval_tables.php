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
        // 1. Costs Table
        Schema::table('costs', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 2. Acceptance Stages 
        Schema::table('acceptance_stages', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 3. Subcontractor Payments
        Schema::table('subcontractor_payments', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 4. Project Payments
        Schema::table('project_payments', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 5. Change Requests
        Schema::table('change_requests', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 6. Material Bills
        Schema::table('material_bills', function (Blueprint $table) {
            $table->index('created_at');
        });

        // 7. Equipment Rentals
        Schema::table('equipment_rentals', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 8. Asset Usages
        Schema::table('asset_usages', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
        });

        // 9. Construction Logs
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->index('log_date');
            $table->index('created_at');
        });

        // 10. Defects
        Schema::table('defects', function (Blueprint $table) {
            $table->index('fixed_at');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('acceptance_stages', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('subcontractor_payments', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('project_payments', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('change_requests', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('material_bills', fn(Blueprint $table) => $table->dropIndex(['created_at']));
        Schema::table('equipment_rentals', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('asset_usages', fn(Blueprint $table) => $table->dropIndex(['created_at', 'updated_at']));
        Schema::table('construction_logs', fn(Blueprint $table) => $table->dropIndex(['log_date', 'created_at']));
        Schema::table('defects', fn(Blueprint $table) => $table->dropIndex(['fixed_at', 'created_at']));
    }
};
