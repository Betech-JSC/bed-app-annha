<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('cost_groups', 'type')) {
            Schema::table('cost_groups', function (Blueprint $table) {
                $table->string('type')->default('project')->after('code')->index(); // 'project' or 'company'
            });

            // Auto-classify existing company cost groups
            DB::table('cost_groups')
                ->where(function ($q) {
                    $q->where('name', 'like', '%mặt bằng%')
                      ->orWhere('name', 'like', '%hành chính%')
                      ->orWhere('name', 'like', '%nhân sự%')
                      ->orWhere('name', 'like', '%marketing%')
                      ->orWhere('code', 'like', 'HC-%')
                      ->orWhere('code', 'like', 'MA-%')
                      ->orWhere('expense_category', 'opex');
                })
                ->update(['type' => 'company']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('cost_groups', 'type')) {
            Schema::table('cost_groups', function (Blueprint $table) {
                $table->dropColumn('type');
            });
        }
    }
};
