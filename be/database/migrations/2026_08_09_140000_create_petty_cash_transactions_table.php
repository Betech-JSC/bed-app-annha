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
        Schema::create('petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // PT-2026-001 (Phiếu thu) / PC-2026-001 (Phiếu chi)
            $table->enum('type', ['inflow', 'outflow'])->default('outflow'); // Inflow = Thu tiền mặt, Outflow = Chi tiền mặt
            $table->string('category')->default('other'); // tam_ung, chi_phi_vp, chi_phi_ct, nop_quy, hoan_ung, khac
            $table->decimal('amount', 15, 2);
            $table->date('transaction_date');
            $table->unsignedBigInteger('project_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable(); // Nhân viên liên quan (đơn vị nộp / nhận)
            $table->string('payer_receiver_name')->nullable(); // Tên người nộp / nhận tự do (nếu là đối tác ngoài)
            $table->text('description')->nullable();
            $table->string('status')->default('draft'); // draft, pending_approval, completed, rejected
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_transactions');
    }
};
