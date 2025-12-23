<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Migration này chạy sau khi các bảng teams và labor_standards đã được tạo
     */
    public function up(): void
    {
        // Add foreign key for labor_standards.team_id (only if table exists)
        if (Schema::hasTable('labor_standards')) {
            Schema::table('labor_standards', function (Blueprint $table) {
                $table->foreign('team_id')
                    ->references('id')
                    ->on('teams')
                    ->onDelete('set null');
            });
        }

        // Add foreign key for team_members.team_id
        Schema::table('team_members', function (Blueprint $table) {
            $table->foreign('team_id')
                ->references('id')
                ->on('teams')
                ->onDelete('cascade');
        });


        // Add foreign key for team_contracts.team_id
        if (Schema::hasTable('team_contracts')) {
            Schema::table('team_contracts', function (Blueprint $table) {
                $table->foreign('team_id')
                    ->references('id')
                    ->on('teams')
                    ->onDelete('cascade');
            });
        }

        // Add foreign keys for work_volumes
        if (Schema::hasTable('work_volumes')) {
            Schema::table('work_volumes', function (Blueprint $table) {
                $table->foreign('team_id')
                    ->references('id')
                    ->on('teams')
                    ->onDelete('set null');

                if (Schema::hasTable('labor_standards')) {
                    $table->foreign('labor_standard_id')
                        ->references('id')
                        ->on('labor_standards')
                        ->onDelete('set null');
                }
            });
        }

        // Add foreign key for subcontractor_payments.work_volume_id
        if (Schema::hasTable('subcontractor_payments') && Schema::hasTable('work_volumes')) {
            Schema::table('subcontractor_payments', function (Blueprint $table) {
                $table->foreign('work_volume_id')
                    ->references('id')
                    ->on('work_volumes')
                    ->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_volumes', function (Blueprint $table) {
            $table->dropForeign(['labor_standard_id']);
            $table->dropForeign(['team_id']);
        });

        Schema::table('labor_standards', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
        });
    }
};
