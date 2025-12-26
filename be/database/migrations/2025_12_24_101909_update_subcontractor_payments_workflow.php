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
        if (Schema::hasTable('subcontractor_payments')) {
            Schema::table('subcontractor_payments', function (Blueprint $table) {
                // Thêm các cột cho workflow mới nếu chưa có
                if (!Schema::hasColumn('subcontractor_payments', 'rejected_by')) {
                    $table->foreignId('rejected_by')->nullable()->after('paid_by')->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('subcontractor_payments', 'rejected_at')) {
                    $table->timestamp('rejected_at')->nullable()->after('paid_at');
                }
                if (!Schema::hasColumn('subcontractor_payments', 'rejection_reason')) {
                    $table->text('rejection_reason')->nullable()->after('rejected_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('subcontractor_payments')) {
            Schema::table('subcontractor_payments', function (Blueprint $table) {
                $table->dropColumn(['rejected_by', 'rejected_at', 'rejection_reason']);
            });
        }
    }
};
