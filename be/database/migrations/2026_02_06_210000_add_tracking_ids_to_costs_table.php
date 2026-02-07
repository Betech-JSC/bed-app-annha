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
        Schema::table('costs', function (Blueprint $table) {
            $table->foreignId('subcontractor_payment_id')
                ->nullable()
                ->constrained('subcontractor_payments')
                ->onDelete('set null')
                ->comment('Liên kết với phiếu chi thầu phụ');

            $table->foreignId('input_invoice_id')
                ->nullable()
                ->constrained('input_invoices')
                ->onDelete('set null')
                ->comment('Liên kết với hóa đơn đầu vào');
                
            $table->foreignId('receipt_id')
                ->nullable()
                ->constrained('receipts')
                ->onDelete('set null')
                ->comment('Liên kết với chứng từ thanh toán/thu chi lẻ');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['subcontractor_payment_id']);
            $table->dropForeign(['input_invoice_id']);
            $table->dropForeign(['receipt_id']);
            $table->dropColumn(['subcontractor_payment_id', 'input_invoice_id', 'receipt_id']);
        });
    }
};
