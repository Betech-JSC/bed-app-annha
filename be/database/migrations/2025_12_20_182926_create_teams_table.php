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
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name'); // Tên đội/tổ
            $table->string('code')->unique()->nullable(); // Mã đội
            $table->enum('type', ['team', 'subcontractor'])->default('team'); // Đội nội bộ hoặc thầu phụ
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete(); // Gắn với dự án cụ thể (nếu có)
            $table->foreignId('team_leader_id')->nullable()->constrained('users')->nullOnDelete(); // Trưởng đội
            $table->foreignId('subcontractor_id')->nullable()->constrained('subcontractors')->nullOnDelete(); // Nếu là đội của thầu phụ
            $table->text('description')->nullable();
            $table->integer('member_count')->default(0); // Số lượng thành viên
            $table->enum('status', ['active', 'inactive', 'disbanded'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index('team_leader_id');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
