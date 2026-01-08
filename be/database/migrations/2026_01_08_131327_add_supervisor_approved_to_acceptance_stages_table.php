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
        Schema::table('acceptance_stages', function (Blueprint $table) {
            // Add supervisor approval fields
            if (!Schema::hasColumn('acceptance_stages', 'supervisor_approved_by')) {
                $table->foreignId('supervisor_approved_by')->nullable()->after('internal_approved_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('acceptance_stages', 'supervisor_approved_at')) {
                $table->timestamp('supervisor_approved_at')->nullable()->after('supervisor_approved_by');
            }
            // Add project manager approval fields
            if (!Schema::hasColumn('acceptance_stages', 'project_manager_approved_by')) {
                $table->foreignId('project_manager_approved_by')->nullable()->after('supervisor_approved_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('acceptance_stages', 'project_manager_approved_at')) {
                $table->timestamp('project_manager_approved_at')->nullable()->after('project_manager_approved_by');
            }
        });

        // Update enum to include supervisor_approved and project_manager_approved
        DB::statement("ALTER TABLE acceptance_stages MODIFY COLUMN status ENUM('pending', 'supervisor_approved', 'project_manager_approved', 'customer_approved', 'internal_approved', 'design_approved', 'owner_approved', 'rejected') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acceptance_stages', function (Blueprint $table) {
            if (Schema::hasColumn('acceptance_stages', 'supervisor_approved_by')) {
                $table->dropForeign(['supervisor_approved_by']);
                $table->dropColumn('supervisor_approved_by');
            }
            if (Schema::hasColumn('acceptance_stages', 'supervisor_approved_at')) {
                $table->dropColumn('supervisor_approved_at');
            }
            if (Schema::hasColumn('acceptance_stages', 'project_manager_approved_by')) {
                $table->dropForeign(['project_manager_approved_by']);
                $table->dropColumn('project_manager_approved_by');
            }
            if (Schema::hasColumn('acceptance_stages', 'project_manager_approved_at')) {
                $table->dropColumn('project_manager_approved_at');
            }
        });

        // Revert enum
        DB::statement("ALTER TABLE acceptance_stages MODIFY COLUMN status ENUM('pending', 'internal_approved', 'customer_approved', 'design_approved', 'owner_approved', 'rejected') DEFAULT 'pending'");
    }
};
