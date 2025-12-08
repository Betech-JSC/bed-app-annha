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
        Schema::table('attachments', function (Blueprint $table) {
            // Thêm polymorphic columns nếu chưa có
            if (!Schema::hasColumn('attachments', 'attachable_id')) {
                $table->unsignedBigInteger('attachable_id')->nullable()->after('type');
            }
            if (!Schema::hasColumn('attachments', 'attachable_type')) {
                $table->string('attachable_type')->nullable()->after('attachable_id');
            }
        });

        // Thêm index riêng biệt với try-catch để tránh lỗi duplicate
        try {
            Schema::table('attachments', function (Blueprint $table) {
                $table->index(['attachable_type', 'attachable_id'], 'attachments_attachable_type_attachable_id_index');
            });
        } catch (\Exception $e) {
            // Index đã tồn tại, bỏ qua (kiểm tra các thông báo lỗi phổ biến)
            $errorMessage = $e->getMessage();
            if (
                strpos($errorMessage, 'Duplicate key') === false &&
                strpos($errorMessage, 'already exists') === false &&
                strpos($errorMessage, '1061') === false
            ) {
                throw $e;
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop index với try-catch
        try {
            Schema::table('attachments', function (Blueprint $table) {
                $table->dropIndex('attachments_attachable_type_attachable_id_index');
            });
        } catch (\Exception $e) {
            // Index không tồn tại, bỏ qua
        }

        // Drop columns nếu tồn tại
        Schema::table('attachments', function (Blueprint $table) {
            if (Schema::hasColumn('attachments', 'attachable_id')) {
                $table->dropColumn('attachable_id');
            }
            if (Schema::hasColumn('attachments', 'attachable_type')) {
                $table->dropColumn('attachable_type');
            }
        });
    }
};
