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
        Schema::create('team_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_leader_id')->constrained('users')->cascadeOnDelete(); // Trưởng đội
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('work_date'); // Ngày làm việc
            $table->string('shift')->nullable(); // Ca làm việc
            $table->string('team_name')->nullable(); // Tên đội/tổ
            $table->text('notes')->nullable();
            $table->boolean('is_offline')->default(false); // Chấm công offline
            $table->timestamp('synced_at')->nullable(); // Thời gian đồng bộ
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_leader_id', 'work_date']);
            $table->index('project_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_check_ins');
    }
};
