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
        Schema::create('input_invoices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete(); // Có thể không gắn với dự án
            $table->string('invoice_type')->nullable(); // Loại hoá đơn (VAT, không VAT, etc.)
            $table->date('issue_date'); // Ngày xuất
            $table->string('invoice_number')->nullable(); // Số hoá đơn
            $table->string('supplier_name')->nullable(); // Tên nhà cung cấp
            $table->decimal('amount_before_vat', 15, 2); // Giá chưa VAT
            $table->decimal('vat_percentage', 5, 2)->default(0); // VAT %
            $table->decimal('vat_amount', 15, 2)->default(0); // Số tiền VAT (tự động tính)
            $table->decimal('total_amount', 15, 2); // Thành tiền (tự động tính)
            $table->text('description')->nullable(); // Mô tả
            $table->text('notes')->nullable(); // Ghi chú
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // Kế toán tạo
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'issue_date']);
            $table->index('invoice_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('input_invoices');
    }
};

