<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('acceptance_items', function (Blueprint $table) {
            // Add supervisor approval fields
            if (!Schema::hasColumn('acceptance_items', 'supervisor_approved_by')) {
                $table->foreignId('supervisor_approved_by')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('acceptance_items', 'supervisor_approved_at')) {
                $table->timestamp('supervisor_approved_at')->nullable()->after('supervisor_approved_by');
            }
        });

        // Update enum to include supervisor_approved
        DB::statement("ALTER TABLE acceptance_items MODIFY COLUMN workflow_status ENUM('draft', 'submitted', 'supervisor_approved', 'project_manager_approved', 'customer_approved', 'rejected') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_items', function (Blueprint $table) {
            if (Schema::hasColumn('acceptance_items', 'supervisor_approved_by')) {
                $table->dropForeign(['supervisor_approved_by']);
                $table->dropColumn('supervisor_approved_by');
            }
            if (Schema::hasColumn('acceptance_items', 'supervisor_approved_at')) {
                $table->dropColumn('supervisor_approved_at');
            }
        });

        // Revert enum
        DB::statement("ALTER TABLE acceptance_items MODIFY COLUMN workflow_status ENUM('draft', 'submitted', 'project_manager_approved', 'customer_approved', 'rejected') DEFAULT 'draft'");
    }
};
