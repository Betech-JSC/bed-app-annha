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
        Schema::table('users', function (Blueprint $table) {
            // KYC Status: pending, verified, rejected
            $table->enum('kyc_status', ['pending', 'verified', 'rejected'])->nullable()->after('avatar');

            // KYC Documents (JSON): lưu thông tin documents đã upload
            $table->json('kyc_documents')->nullable()->after('kyc_status');

            // KYC Submitted At
            $table->timestamp('kyc_submitted_at')->nullable()->after('kyc_documents');

            // KYC Verified At
            $table->timestamp('kyc_verified_at')->nullable()->after('kyc_submitted_at');

            // KYC Verified By (admin ID)
            $table->unsignedBigInteger('kyc_verified_by')->nullable()->after('kyc_verified_at');
            $table->foreign('kyc_verified_by')->references('id')->on('admins')->onDelete('set null');

            // KYC Rejection Reason
            $table->text('kyc_rejection_reason')->nullable()->after('kyc_verified_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['kyc_verified_by']);
            $table->dropColumn([
                'kyc_status',
                'kyc_documents',
                'kyc_submitted_at',
                'kyc_verified_at',
                'kyc_verified_by',
                'kyc_rejection_reason',
            ]);
        });
    }
};
