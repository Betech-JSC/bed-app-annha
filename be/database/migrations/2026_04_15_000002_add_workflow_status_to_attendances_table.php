<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Luồng duyệt riêng biệt với status chấm công
            // draft     → NV check-in/out nhưng chưa gửi duyệt
            // submitted → NV đã gửi duyệt, chờ manager
            // approved  → Manager đã duyệt → tự động tạo Cost
            // rejected  → Manager từ chối, NV cần sửa lại
            $table->enum('workflow_status', ['draft', 'submitted', 'approved', 'rejected'])
                ->default('draft')
                ->after('note')
                ->comment('Trạng thái duyệt: draft/submitted/approved/rejected');

            $table->text('rejected_reason')->nullable()->after('workflow_status');

            $table->index('workflow_status');
        });

        // Backfill: các record đã có approved_by → approved
        DB::statement("
            UPDATE attendances
            SET workflow_status = 'approved'
            WHERE approved_by IS NOT NULL
        ");

        // Backfill: các record chưa approved → submitted (coi như đã gửi)
        DB::statement("
            UPDATE attendances
            SET workflow_status = 'submitted'
            WHERE approved_by IS NULL
              AND (check_in IS NOT NULL OR status IN ('absent','leave','holiday'))
        ");
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['workflow_status']);
            $table->dropColumn(['workflow_status', 'rejected_reason']);
        });
    }
};
