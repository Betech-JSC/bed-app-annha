<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_usages', function (Blueprint $table) {
            // Approval workflow fields (3-level: BĐH + KT)
            $table->foreignId('approved_by')->nullable()->after('created_by');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->foreignId('confirmed_by')->nullable()->after('approved_at');
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            $table->text('rejection_reason')->nullable()->after('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('asset_usages', function (Blueprint $table) {
            $table->dropColumn([
                'approved_by', 'approved_at',
                'confirmed_by', 'confirmed_at',
                'rejection_reason',
            ]);
        });
    }
};
