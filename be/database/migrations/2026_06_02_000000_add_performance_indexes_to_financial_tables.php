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
            $table->index(['project_id', 'status', 'cost_date'], 'costs_project_status_date_idx');
            $table->index('material_bill_id', 'costs_material_bill_id_idx');
        });

        Schema::table('project_payments', function (Blueprint $table) {
            $table->index(['project_id', 'status', 'paid_date'], 'project_payments_project_status_date_idx');
        });

        Schema::table('material_bills', function (Blueprint $table) {
            $table->index(['project_id', 'status', 'bill_date'], 'material_bills_project_status_date_idx');
        });

        Schema::table('subcontractor_payments', function (Blueprint $table) {
            $table->index('subcontractor_id', 'subcontractor_payments_subcontractor_id_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropIndex('costs_project_status_date_idx');
            $table->dropIndex('costs_material_bill_id_idx');
        });

        Schema::table('project_payments', function (Blueprint $table) {
            $table->dropIndex('project_payments_project_status_date_idx');
        });

        Schema::table('material_bills', function (Blueprint $table) {
            $table->dropIndex('material_bills_project_status_date_idx');
        });

        Schema::table('subcontractor_payments', function (Blueprint $table) {
            $table->dropIndex('subcontractor_payments_subcontractor_id_idx');
        });
    }
};
