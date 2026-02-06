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
            // Add cost_group_id for categorization
            $table->unsignedBigInteger('cost_group_id')->nullable()->after('project_id');
            $table->foreign('cost_group_id')->references('id')->on('cost_groups')->onDelete('set null');
            
            // Remove payment workflow fields
            $table->dropColumn(['status', 'due_date', 'paid_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Remove cost_group_id
            $table->dropForeign(['cost_group_id']);
            $table->dropColumn('cost_group_id');
            
            // Restore payment workflow fields
            $table->string('status')->default('draft')->after('notes');
            $table->date('due_date')->nullable()->after('invoice_date');
            $table->date('paid_date')->nullable()->after('status');
        });
    }
};
