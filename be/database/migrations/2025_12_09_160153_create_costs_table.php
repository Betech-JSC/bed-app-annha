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
        Schema::create('costs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->enum('category', [
                'construction_materials', // Vật liệu xây dựng
                'concrete', // Bê tông
                'labor', // Nhân công
                'equipment', // Thiết bị
                'transportation', // Vận chuyển
                'other' // Chi phí khác
            ])->default('other');
            $table->string('name'); // Tên chi phí
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->date('cost_date'); // Ngày phát sinh chi phí
            $table->enum('status', [
                'draft', // Nháp (Quản lý dự án nhập)
                'pending_management_approval', // Chờ Ban điều hành duyệt
                'pending_accountant_approval', // Chờ Kế toán xác nhận
                'approved', // Đã duyệt
                'rejected' // Từ chối
            ])->default('draft');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // Quản lý dự án
            $table->foreignId('management_approved_by')->nullable()->constrained('users')->nullOnDelete(); // Ban điều hành
            $table->timestamp('management_approved_at')->nullable();
            $table->foreignId('accountant_approved_by')->nullable()->constrained('users')->nullOnDelete(); // Kế toán
            $table->timestamp('accountant_approved_at')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'category']);
            $table->index(['project_id', 'status']);
            $table->index('cost_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('costs');
    }
};
