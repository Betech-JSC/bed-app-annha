<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            // Approval workflow fields
            if (!Schema::hasColumn('equipment', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('equipment', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('created_by');
            }
            if (!Schema::hasColumn('equipment', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
            if (!Schema::hasColumn('equipment', 'confirmed_by')) {
                $table->unsignedBigInteger('confirmed_by')->nullable()->after('approved_at');
            }
            if (!Schema::hasColumn('equipment', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            }
            if (!Schema::hasColumn('equipment', 'rejection_reason')) {
                $table->string('rejection_reason', 500)->nullable()->after('confirmed_at');
            }
            $table->integer('quantity')->default(1)->change();
        });

        // Convert status ENUM → VARCHAR to support approval workflow statuses
        DB::statement("ALTER TABLE `equipment` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'draft'");

        // Update existing records to 'available' (already in stock)
        DB::table('equipment')->whereNull('status')->orWhere('status', '')->update(['status' => 'available']);
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `equipment` MODIFY COLUMN `status` ENUM('available','in_use','maintenance','retired') NOT NULL DEFAULT 'available'");

        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn(['created_by', 'approved_by', 'approved_at', 'confirmed_by', 'confirmed_at', 'rejection_reason']);
        });
    }
};
