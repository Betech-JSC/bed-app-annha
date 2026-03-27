<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->string('shift')->nullable()->after('notes')
                ->comment('Ca làm việc: morning, afternoon, night');
            $table->json('work_items')->nullable()->after('shift')
                ->comment('Danh sách công việc thực hiện [{name, quantity, unit, progress}]');
            $table->text('issues')->nullable()->after('work_items')
                ->comment('Vấn đề phát sinh');
            $table->text('safety_notes')->nullable()->after('issues')
                ->comment('Ghi chú an toàn');
            $table->text('delay_reason')->nullable()->after('safety_notes')
                ->comment('Lý do chậm tiến độ');
            $table->unsignedBigInteger('adjustment_id')->nullable()->after('delay_reason');
            $table->string('approval_status')->default('draft')->after('adjustment_id')
                ->comment('draft, pending, approved, rejected');
            $table->unsignedBigInteger('approved_by')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approved_by');

            $table->foreign('adjustment_id')->references('id')->on('schedule_adjustments')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });

        // Bảng phê duyệt nhật ký
        Schema::create('daily_report_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('construction_log_id');
            $table->unsignedBigInteger('approver_id');
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('construction_log_id')->references('id')->on('construction_logs')->cascadeOnDelete();
            $table->foreign('approver_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['construction_log_id', 'approver_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_approvals');

        Schema::table('construction_logs', function (Blueprint $table) {
            $table->dropForeign(['adjustment_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'shift', 'work_items', 'issues', 'safety_notes',
                'delay_reason', 'adjustment_id', 'approval_status',
                'approved_by', 'approved_at',
            ]);
        });
    }
};
